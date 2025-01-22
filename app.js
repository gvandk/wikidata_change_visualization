require('dotenv').config();

const express = require('express');
const ejs = require('ejs');

const path = require('path')


const query = require('./kg');
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