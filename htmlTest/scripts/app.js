require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});

require(['vs/editor/editor.main'], function () {
  monaco.editor.create(document.getElementById('editor'), {
    value: [
      'function hello() {',
      "\tconsole.log('Hello world!');",
      '  document.body.style.background = "#222";',
      '}',
      '',
      'hello();'
    ].join('\n'),
    language: 'javascript',
    theme: 'vs-dark',
    automaticLayout: true,
  });
});