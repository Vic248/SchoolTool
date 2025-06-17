require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
  const editor = monaco.editor.create(document.getElementById('editor'), {
    value: `// Tape ton code JavaScript ici\nconsole.log(\"Hello world!\");\ndocument.body.style.background = \"#ffc\";`,
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
        <script>${code}<\/script>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    preview.src = URL.createObjectURL(blob);
  });
});
