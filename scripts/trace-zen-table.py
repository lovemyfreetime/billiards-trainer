#!/usr/bin/env python3
"""Reproduce the 3D plan-view reference from the existing Zen artwork.

Pixel coordinates use the same playing-surface registration as drawZenTable.
Only the dark pocket contours are sampled; cushion corners and the rounded
outer rail are measured vector anchors, not a new procedural pocket design.
Requires Pillow, NumPy and SciPy for this offline authoring step. Runtime has no Python dependency.
"""
import hashlib
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
from scipy.optimize import least_squares

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'icons/zen-reference-table-v1.webp'
im = Image.open(ART).convert('RGB')
pixels = im.load()
centres = [(290,111),(839,100),(1387,111),(1387,660),(839,674),(290,660)]
holes = []
for ordinal, (cx, cy) in enumerate(centres):
    radii = []
    for i in range(128):
        angle = i * math.tau / 128
        radius = 5
        # The local window prevents a connected cushion shadow from becoming
        # part of the pocket trace when its brightness matches the opening.
        while radius < 34:
            x, y = round(cx + math.cos(angle)*radius), round(cy + math.sin(angle)*radius)
            if max(pixels[x,y]) >= 22:
                break
            radius += .25
        radii.append(radius)
    # Ignore the two rail-facing sectors: the bitmap's cast shadow is connected
    # to the black hole there, but it is not part of the machined slate outline.
    hidden = {0:[0,90],2:[180,90],3:[180,270],5:[0,270]}.get(ordinal,[])
    samples=[]
    for i,r in enumerate(radii):
        angle=i*math.tau/128;deg=math.degrees(angle)
        if r<33 and not any(abs((deg-h+180)%360-180)<27 for h in hidden):
            samples.append([cx+math.cos(angle)*r,cy+math.sin(angle)*r])
    samples=np.array(samples)
    def residual(v):
        x,y=samples[:,0]-v[0],samples[:,1]-v[1];c,s=math.cos(v[4]),math.sin(v[4])
        return np.sqrt(((x*c+y*s)/v[2])**2+((-x*s+y*c)/v[3])**2)-1
    fit=least_squares(residual,[cx,cy,26,25,0],bounds=([cx-5,cy-5,17,17,-math.pi],[cx+5,cy+5,35,35,math.pi]),loss='soft_l1',f_scale=.04).x
    contour=[]
    for i in range(128):
        a=i*math.tau/128;x,y=math.cos(a)*fit[2],math.sin(a)*fit[3];c,s=math.cos(fit[4]),math.sin(fit[4]);contour.append([round(fit[0]+x*c-y*s,3),round(fit[1]+x*s+y*c,3)])
    holes.append({'centre':[round(fit[0],3),round(fit[1],3)],'contour':contour,'fitMedianErrorPixels':round(float(np.median(np.abs(residual(fit)))*(fit[2]+fit[3])/2),3)})

rails = [
 {'fore':[[337,120],[806,120]],'back':[[315,98],[814,98]],'pocket':2},
 {'fore':[[873,120],[1340,120]],'back':[[865,98],[1362,98]],'pocket':3},
 {'fore':[[1379,160],[1379,612]],'back':[[1400,138],[1400,634]],'pocket':4},
 {'fore':[[1340,650],[873,650]],'back':[[1362,671],[866,671]],'pocket':5},
 {'fore':[[805,650],[337,650]],'back':[[812,671],[315,671]],'pocket':6},
 {'fore':[[298,612],[298,160]],'back':[[277,634],[277,138]],'pocket':1},
]
outer=[]
def line(a,b):
    if not outer: outer.append(a)
    outer.append(b)
def curve(a,c,b):
    for i in range(1,25):
        t=i/24; outer.append([round(a[j]*(1-t)**2+2*c[j]*t*(1-t)+b[j]*t*t,3) for j in range(2)])
line([286,58],[1392,58]);curve([1392,58],[1444,58],[1444,111])
line([1444,111],[1444,659]);curve([1444,659],[1444,712],[1392,712])
line([1392,712],[286,712]);curve([286,712],[234,712],[234,659])
line([234,659],[234,111]);curve([234,111],[234,58],[286,58])
sights = [[x,82] for x in [427,564,700,978,1115,1251]] + [[x,687] for x in [427,565,700,978,1115,1251]] + [[x,y] for x in [258,1419] for y in [248,386,526]]
data={'source':'icons/zen-reference-table-v1.webp','sha256':hashlib.sha256(ART.read_bytes()).hexdigest(),'registration':{'width':1678,'height':937,'x0':298,'x1':1379,'y0':120,'y1':650},'outer':outer,'rails':rails,'pockets':holes,'sights':sights,'sightRadius':1.8,'rimWidth':5.5}
target=ROOT/'trainer-zen-shapes.js'
target.write_text("/* Measured Zen table contours. Regenerate with scripts/trace-zen-table.py. */\n(function(root){'use strict';const shapes="+json.dumps(data,separators=(',',':'))+";if(typeof module==='object'&&module.exports)module.exports=shapes;else root.BilliardsZenShapes=shapes;})(typeof window==='object'?window:globalThis);\n")
print(f'{target.name}: {len(holes)} pocket contours, six cushion polygons, outer rail and 18 round sights')
