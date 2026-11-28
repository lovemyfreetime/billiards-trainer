import com.sun.source.util.JavacTask;
import java.lang.reflect.Method;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaFileObject;
import javax.tools.ToolProvider;

class ChasePreviewChecks {
    static void eq(Object actual, Object expected) {
        if (!Objects.equals(actual, expected))
            throw new AssertionError("Expected " + expected + " but got " + actual);
    }
    public static void main(String[] args) throws Exception {
        var compiler = ToolProvider.getSystemJavaCompiler();
        var files = compiler.getStandardFileManager(null, null, null);
        var javaSources = Arrays.stream(args).map(Path::of).toList();
        var diagnostics = new DiagnosticCollector<JavaFileObject>();
        var parse = (JavacTask) compiler.getTask(null, files, diagnostics,
            List.of("-source", "8", "-target", "8", "-proc:none"), null, files.getJavaFileObjectsFromPaths(javaSources));
        parse.parse();
        if (diagnostics.getDiagnostics().stream().anyMatch(d -> d.getKind() == Diagnostic.Kind.ERROR))
            throw new AssertionError(diagnostics.getDiagnostics());
        Path out = Files.createTempDirectory("chase-url-tests-");
        try {
            eq(compiler.run(null, null, null, "-source", "8", "-target", "8", "-d", out.toString(), args[2]), 0);
            try (var classloader = new URLClassLoader(new java.net.URL[]{out.toUri().toURL()})) {
                var clazz = classloader.loadClass("com.lovemyfreetime.billiardstrainer.ChasePreviewAddress");
                Method normalize = clazz.getDeclaredMethod("normalize", String.class);
                Method isOrigin = clazz.getDeclaredMethod("sameOrigin", String.class, String.class);
                normalize.setAccessible(true);
                isOrigin.setAccessible(true);
                String expected = "https://example.tailabc.ts.net:9443/";
                eq(normalize.invoke(null, " HTTPS://EXAMPLE.TailABC.TS.NET:9443 "), expected);
                eq(normalize.invoke(null, expected), expected);
                eq(normalize.invoke(null, "https://pc.team.ts.net:443/"), "https://pc.team.ts.net/");
                for (String invalid : new String[]{"http://pc.team.ts.net", "https://pc.team.ts.net.evil/",
                        "https://evil@pc.team.ts.net", "https://evil.example/?ts.net", "https://pc.team.ts.net/files",
                        "https://pc.team.ts.net/?a=b", "https://pc.team.ts.net/#book", "file:///index.html",
                        "javascript:alert(1)", "https://pc.team.ts.net:65536", "", "https:pc.team.ts.net",
                        "https://localhost:9443", "https://pc.team.ts.net:0/", "https://example.ts.net"}) {
                    eq(normalize.invoke(null, invalid), null);
                }
                eq(isOrigin.invoke(null, expected, expected + "api/private-coach/audio?x=y"), true);
                eq(isOrigin.invoke(null, expected, "https://EXAMPLE.tailabc.ts.net:9443/"), true);
                for (String invalid : new String[]{"http://example.tailabc.ts.net:9443/", "https://example.tailabc.ts.net/",
                        "https://other.tailabc.ts.net:9443/", "https://evil.example/", "file:///index.html",
                        "https://evil@example.tailabc.ts.net:9443/", "https://example.tailabc.ts.net:8443/"}) {
                    eq(isOrigin.invoke(null, expected, invalid), false);
                }
            }
        } finally {
            try (var list = Files.walk(out)) {
                for (var file : list.sorted(java.util.Comparator.reverseOrder()).toList()) Files.delete(file);
            }
        }
        System.out.println("3 Java files parse under Java 8; 27 endpoint and origin assertions passed.");
    }
}
