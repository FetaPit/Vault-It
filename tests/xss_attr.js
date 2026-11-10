// attribute-injection variant of the XSS check (the runner and CI run it as its own test)
process.argv[2] = 'attr';
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
require('./xss.js');
