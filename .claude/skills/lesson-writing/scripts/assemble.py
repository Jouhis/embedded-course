"""Rebuild a lesson from new prose while keeping every technical block byte-identical.

Usage:
  python -I assemble.py list  <lesson.html>                 # show the keepable blocks and their ids
  python -I assemble.py build <lesson.html> <body.html>     # write the new lesson in place

<body.html> holds everything from <h1> to the end of <main>'s content, with placeholders such as
{{FIGURE1}}, {{WIDGET1}}, {{CJS1}}, {{CODE1}}, {{TABLE1}},
{{LSIM1}} (logic simulator), {{NET1}} (CircuitJS netlist), {{CPU1}} (CPU simulator) where the original blocks go. The end
of the lesson is placed either with {{REST}} (everything from the first quiz to the end) or with
one {{QUIZn}} per quiz plus {{SOURCE}} (the .source box to the end), for lessons whose quizzes
sit between other sections. Every content block must be used exactly once. The original is read
from git HEAD, so a second rewrite still starts from the committed text. Output keeps CRLF.
"""
import re, subprocess, sys

PATTERNS = {
    'FIGURE': r'<figure>.*?</figure>',
    'WIDGET': r'<div class="widget anim".*?</ol>\n  </div>',
    'CJS': r'<div class="circuitjs-live"[^\n]*</div>',
    'CODE': r'(?<!>)<pre><code class="language-.*?</code></pre>',
    'TABLE': r'<table>.*?</table>',
    'LSIM': r'<div class="widget logicsim".*?</script>\n  </div>',
    'NET': r'<pre class="circuitjs".*?</pre>',
    'CPU': r'<div class="widget cpusim".*?</script>\n  </div>',
}
QUIZ = r'<div class="widget quiz".*?</script>\n  </div>'


def original(path):
    rel = path.replace(chr(92), '/')
    text = subprocess.run(['git', 'show', f'HEAD:{rel}'], capture_output=True, check=True,
                          encoding='utf-8').stdout
    return text.replace('\r', '')


def blocks(o):
    start = o.index('  <h1>')
    src = o.index('  <div class="source">')
    body = o[start:src]
    out = {}
    quizzes = re.findall(QUIZ, body, re.S)
    for i, q in enumerate(quizzes, 1):
        out[f'QUIZ{i}'] = '  ' + q
    plain = re.sub(QUIZ, '', body, flags=re.S)
    for kind, pat in PATTERNS.items():
        for i, m in enumerate(re.findall(pat, plain, re.S), 1):
            out[f'{kind}{i}'] = '  ' + m
    out['SOURCE'] = o[src:].rstrip('\n')
    first_quiz = o.find('  <div class="widget quiz"', start)
    out['REST'] = o[first_quiz:].rstrip('\n') if first_quiz != -1 else None
    return out


def main():
    mode, path = sys.argv[1], sys.argv[2]
    o = original(path)
    parts = blocks(o)
    if mode == 'list':
        sys.stdout.reconfigure(encoding='utf-8')
        for k, v in parts.items():
            if v is not None:
                print(f'{{{{{k}}}}}  {v.strip()[:90]!r}')
        return
    b = open(sys.argv[3], encoding='utf-8').read().replace('\r', '')
    used = set(re.findall(r'\{\{([A-Z]+\d*)\}\}', b))
    unknown = used - {k for k, v in parts.items() if v is not None}
    if unknown:
        sys.exit(f'unknown placeholders: {sorted(unknown)}')
    tail = {'REST'} if 'REST' in used else {k for k in parts if k.startswith('QUIZ')} | {'SOURCE'}
    need = {k for k in parts if k[:4] not in ('QUIZ', 'SOUR', 'REST')} | tail
    for k in need:
        n = b.count('{{%s}}' % k)
        if n != 1:
            sys.exit(f'placeholder {{{{{k}}}}} used {n} times, expected 1')
    if 'REST' in used and (used & ({k for k in parts if k.startswith('QUIZ')} | {'SOURCE'})):
        sys.exit('use either {{REST}} or {{QUIZn}} + {{SOURCE}}, not both')
    for k in used:
        b = b.replace('{{%s}}' % k, parts[k])
    head = o[:o.index('  <h1>')]
    open(path, 'w', encoding='utf-8', newline='\r\n').write(head + b.rstrip('\n') + '\n')
    print('wrote', path)


main()
