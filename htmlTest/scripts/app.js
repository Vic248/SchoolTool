require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    noLib: false,
    lib: ["es2020", "dom"]
  });

  const editor = monaco.editor.create(document.getElementById('editor'), {
    value: `console.log("Hello world!");\ndocument.body.style.background = "#ffc";`,
    language: 'javascript',
    theme: 'vs-dark',
    automaticLayout: true
  });

  const runBtn = document.getElementById('run-btn');
  const preview = document.getElementById('preview');

  runBtn.addEventListener('click', () => {
    const code = editor.getValue();
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Résultat</title></head>
      <body>
        <script>
          try {
            ${code}
          } catch(e) {
            document.body.innerHTML = '<pre style="color:red;">' + e.toString() + '</pre>';
          }
        <\/script>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    preview.src = URL.createObjectURL(blob);
  });
});
