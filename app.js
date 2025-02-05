require('dotenv').config();

const express = require('express');
const ejs = require('ejs');

const path = require('path')


const graph = require('./graph');
const app = express();

app.set('view engine', 'ejs');

app.use('/img', express.static(path.join(__dirname, 'static/images')))
app.use('/js', express.static(path.join(__dirname, 'static/js')))
app.use('/css', express.static(path.join(__dirname, 'static/css')))

const hostname = '0.0.0.0';
const port = 3000;


// Enable CORS for all routes (allowing requests from any origin)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get("/", (req, res) => {
  res.render('visualization');
});

app.get("/getDataDirect/:wikidataCode/:year/:includeID", (req, res) => {
  console.log(req.params.year);
  res.send(JSON.stringify({ username: "example" }))
});




app.get("/getDbpName/:wikidataCode", (req, res) => {
  const wikidataCode = req.params.wikidataCode;
  res.send(JSON.stringify({ username: "example" }))
});


app.get("/getEventsTemp/:name/:start/:end", (req, res) => {
  const name = req.params.name;
  const start = req.params.start;
  const end = req.params.end;
  graph.getEventsTemp(name, start, end, (err, data) => {
    res.json(data);
  });
});

app.get("/getEventsText/:name/:start/:end", (req, res) => {
  const name = req.params.name;
  const start = req.params.start;
  const end = req.params.end;
  graph.getEventsText(name, start, end, (err, data) => {
    res.json(data);
  });
});




app.get("/wd_query/*/*", (req, res) => {
  const year = req.params[0]
  const entity_id = req.params[1]
  query.wikidata_query(year, feature_id, (error, data) => {
    res.json(data);
  });
})

// Invalid path handler!
const invalidPathHandler = (req, res, next) => {
  res.redirect("/")
}

app.use(invalidPathHandler);


app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
  console.log(`SPARQL endpoint --> ${process.env.WD_ENDPOINT}`);
});