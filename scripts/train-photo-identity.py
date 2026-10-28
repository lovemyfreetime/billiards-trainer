#!/usr/bin/env python3
"""Train the local ball-family/stripe forests from anonymous feature records."""
import argparse
import json
import math
import platform
from importlib.metadata import version
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestClassifier

ID_ORDER = [10, 11, 12, 13, 14, 15, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
MIXTURE_GRID = [0.0, 0.25, 0.5, 0.65, 0.8, 0.9, 1.0]
FEATURE_COUNT = 90
FEATURE_VERSION = "body-hsv-90-v1"
MODEL_VERSION = "body-hsv-90-v2"


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", required=True, type=Path, help="JSON array of anonymous feature records")
    parser.add_argument("--output", required=True, type=Path, help="Output UMD model JavaScript path")
    parser.add_argument("--metrics", required=True, type=Path, help="Output OOF metrics JSON path")
    return parser.parse_args()


def load_records(path):
    records = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(records, list) or not records:
        raise ValueError("--samples must contain a non-empty JSON array")
    expected = {"features", "id", "group", "neural"}
    normalized = []
    for index, record in enumerate(records):
        if not isinstance(record, dict) or set(record) != expected:
            raise ValueError(f"record {index} must contain exactly features, id, group, and neural")
        ball_id = record["id"]
        if isinstance(ball_id, bool) or not isinstance(ball_id, int) or not 0 <= ball_id <= 15:
            raise ValueError(f"record {index} id must be an integer from 0 to 15")
        group = record["group"]
        if not isinstance(group, str) or not group.strip():
            raise ValueError(f"record {index} group must be a non-empty string")
        features = record["features"]
        neural = record["neural"]
        if not isinstance(features, list) or len(features) != FEATURE_COUNT:
            raise ValueError(f"record {index} features must be an array of {FEATURE_COUNT} numbers")
        if not isinstance(neural, list) or len(neural) != len(ID_ORDER):
            raise ValueError(f"record {index} neural must be 16 scores in PV_AI_CLASSES order")
        try:
            features = [float(value) for value in features]
            neural = [float(value) for value in neural]
        except (TypeError, ValueError) as error:
            raise ValueError(f"record {index} features and neural values must be numeric") from error
        if not all(math.isfinite(value) for value in features):
            raise ValueError(f"record {index} features must be finite")
        if not all(math.isfinite(value) and value >= 0 for value in neural):
            raise ValueError(f"record {index} neural scores must be finite and nonnegative")
        total = sum(neural)
        neural = [value / total for value in neural] if total > 0 else [0.0] * len(ID_ORDER)
        normalized.append({"features": features, "id": ball_id, "group": group, "neural": neural})
    if len({record["group"] for record in normalized}) < 2:
        raise ValueError("Grouped out-of-fold calibration requires at least two groups")
    return normalized


def family(ball_id):
    return ball_id - 8 if ball_id >= 9 else ball_id


def fit_forests(features, ids):
    color = RandomForestClassifier(
        n_estimators=80, max_depth=6, min_samples_leaf=2,
        max_features=0.6, random_state=28, class_weight="balanced",
    )
    stripe = RandomForestClassifier(
        n_estimators=80, max_depth=5, min_samples_leaf=2,
        max_features=0.6, random_state=28, class_weight="balanced",
    )
    family_ids = np.asarray([family(int(ball_id)) for ball_id in ids], dtype=np.int64)
    color.fit(features, family_ids)
    stripe_mask = ~np.isin(family_ids, [0, 8])
    stripe.fit(features[stripe_mask], (np.asarray(ids)[stripe_mask] >= 9).astype(np.int64))
    expected_color = set(range(9))
    if set(map(int, color.classes_)) != expected_color:
        raise ValueError("Each training fold must contain all nine ball family classes")
    if set(map(int, stripe.classes_)) != {0, 1}:
        raise ValueError("Each training fold must contain solid and stripe examples")
    return color, stripe


def visual_posteriors(color, stripe, features):
    family_probabilities = color.predict_proba(features)
    color_indices = {int(label): index for index, label in enumerate(color.classes_)}
    stripe_indices = {int(label): index for index, label in enumerate(stripe.classes_)}
    if set(color_indices) != set(range(9)) or set(stripe_indices) != {0, 1}:
        raise ValueError("A fitted model is missing a required class")
    stripe_probability = stripe.predict_proba(features)[:, stripe_indices[1]]
    result = np.zeros((len(features), len(ID_ORDER)), dtype=np.float64)
    for position, ball_id in enumerate(ID_ORDER):
        base = family(ball_id)
        family_probability = family_probabilities[:, color_indices[base]]
        if ball_id in (0, 8):
            result[:, position] = family_probability
        elif ball_id >= 9:
            result[:, position] = family_probability * stripe_probability
        else:
            result[:, position] = family_probability * (1.0 - stripe_probability)
    row_sums = result.sum(axis=1, keepdims=True)
    result = np.divide(result, row_sums, out=np.zeros_like(result), where=row_sums > 0)
    return result


def log_loss(truth_positions, probabilities):
    selected = probabilities[np.arange(len(truth_positions)), truth_positions]
    return float(-np.log(np.clip(selected, 1e-5, 1.0)).mean())


def export_forest(classifier):
    trees = []
    for estimator in classifier.estimators_:
        tree = estimator.tree_
        values = tree.value[:, 0, :]
        values = values / np.maximum(1e-20, values.sum(axis=1, keepdims=True))
        trees.append({
            "children_left": tree.children_left.tolist(),
            "children_right": tree.children_right.tolist(),
            "feature": tree.feature.tolist(),
            "threshold": tree.threshold.tolist(),
            "value": values.tolist(),
        })
    return {"classes": classifier.classes_.tolist(), "trees": trees}


def main():
    args = parse_args()
    records = load_records(args.samples)
    features = np.asarray([record["features"] for record in records], dtype=np.float64)
    ids = np.asarray([record["id"] for record in records], dtype=np.int64)
    neural = np.asarray([record["neural"] for record in records], dtype=np.float64)
    groups = np.asarray([record["group"] for record in records], dtype=object)
    unique_groups = sorted(set(groups.tolist()))

    required_family_classes = set(range(9))
    all_families = {family(int(ball_id)) for ball_id in ids}
    all_stripes = {int(ball_id >= 9) for ball_id in ids if family(int(ball_id)) not in (0, 8)}
    if all_families != required_family_classes or all_stripes != {0, 1}:
        raise ValueError("Samples must cover all nine families, plus both solid and stripe classes")

    oof_visual = np.zeros((len(records), len(ID_ORDER)), dtype=np.float64)
    fold_sizes = []
    for group in unique_groups:
        test_mask = groups == group
        train_mask = ~test_mask
        color, stripe = fit_forests(features[train_mask], ids[train_mask])
        oof_visual[test_mask] = visual_posteriors(color, stripe, features[test_mask])
        fold_sizes.append(int(test_mask.sum()))

    truth_position = np.asarray([ID_ORDER.index(int(ball_id)) for ball_id in ids], dtype=np.int64)
    selection = []
    for mixture in MIXTURE_GRID:
        blended = (1.0 - mixture) * neural + mixture * oof_visual
        selection.append({
            "mixture": mixture,
            "logLoss": log_loss(truth_position, blended),
            "top1Correct": int(np.sum(np.asarray(ID_ORDER)[np.argmax(blended, axis=1)] == ids)),
        })
    selected = min(selection, key=lambda row: (row["logLoss"], row["mixture"]))

    color, stripe = fit_forests(features, ids)
    model = {
        "schema": 1,
        "featureVersion": FEATURE_VERSION,
        "version": MODEL_VERSION,
        "cropPadding": 0.12,
        "mixture": selected["mixture"],
        "trainingSamples": len(records),
        "color": export_forest(color),
        "stripe": export_forest(stripe),
    }
    wrapper = (
        "(function(root){'use strict';const model="
        + json.dumps(model, separators=(",", ":"), allow_nan=False)
        + ";if(typeof module==='object'&&module.exports)module.exports=model;"
        + "else root.BilliardsBallIdentityModel=model;})(typeof window==='object'?window:globalThis);\n"
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(wrapper, encoding="utf-8")

    group_counts = sorted(int(np.sum(groups == group)) for group in unique_groups)
    metrics = {
        "featureVersion": FEATURE_VERSION,
        "modelVersion": MODEL_VERSION,
        "trainingSamples": len(records),
        "groups": len(unique_groups),
        "recordsPerGroup": group_counts,
        "oofMethod": "leave-one-group-out",
        "oofFoldSizes": fold_sizes,
        "mixtureGrid": selection,
        "selectedMixture": selected["mixture"],
        "selectedOOFLogLoss": selected["logLoss"],
        "selectedOOFTop1Correct": selected["top1Correct"],
        "dependencies": {
            "python": platform.python_version(),
            "numpy": version("numpy"),
            "scikitLearn": version("scikit-learn"),
        },
        "forestParameters": {
            "nEstimators": 80,
            "colorMaxDepth": 6,
            "stripeMaxDepth": 5,
            "minSamplesLeaf": 2,
            "maxFeatures": 0.6,
            "randomState": 28,
            "classWeight": "balanced",
        },
    }
    args.metrics.parent.mkdir(parents=True, exist_ok=True)
    args.metrics.write_text(json.dumps(metrics, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"Trained {len(records)} records across {len(unique_groups)} groups; selected mixture {selected['mixture']:.2f} (OOF logloss {selected['logLoss']:.4f}).")


if __name__ == "__main__":
    main()
