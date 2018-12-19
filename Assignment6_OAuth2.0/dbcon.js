var mysql = require('mysql');
var pool = mysql.createPool({
  connectionLimit : 10,
  host            : 'mysql.eecs.oregonstate.edu',
  user            : 'cs290_whited6',
  password        : 'C0nS1N1704',
  database        : 'workdouts'
});

module.exports.pool = pool;
