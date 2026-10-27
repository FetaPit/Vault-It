// attribute-injection variant of the XSS check (the runner and CI run it as its own test)
process.argv[2] = 'attr';
require('./xss.js');
