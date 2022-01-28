const express = require("express");
const ytdl = require("ytdl-core");
const Voice = require('@discordjs/voice');
const yt = require('youtube-dl-exec');
const app = express();

require("dotenv").config();

const port = process.env.PORT || 8080;
const ytdl_path = process.env.YOUTUBEDL_PATH || "";

app.get("/", (req, res) => {
  console.log(">> / ");
  
  res.sendStatus(200);
});

app.get("/audio", (req, res) => {
  console.log(">> /audio " + JSON.stringify(req.query));

  try {
    let videourl = decodeURIComponent(req.query.u);
    
    if (req.query.ver == 'v2')
      res.set('content-type', 'audio/webm');
    else
      res.set('content-type', 'audio/mpeg');

    res.set('accept-ranges', 'bytes');
    res.set('processed_url', videourl);

    console.log(">> serving video " + videourl);
    ytdl(videourl, {filter: 'audioonly'}).pipe(res);
  } catch (e) {
    console.log("[ERROR /audio] " + e);
    res.sendStatus(500);
  }
});

app.get('/live', (req, res) => {
  console.log(">> /live " + JSON.stringify(req.query));

  try {
    let videourl = decodeURIComponent(req.query.u);

    const p = yt.create(ytdl_path).exec(
      videourl,
      {
        o: '-',
        q: '',
        f: '92',
        r: '100K'
      },
      {
        stdio: ['ignore', 'pipe', 'ignore']
      }
    );

    if (!p.stdout) {
      console.log("[ERROR /live] No Stdout on youtube-dl process.");
      res.sendStatus(500);
      return;
    }

    const st = p.stdout;

    const onError = error => {
      if (!p.killed) {
        p.kill();
      }

      st.resume();
      console.log("[ERROR /live] OnError: " + error);
    };

    p.once('spawn', () => {
      Voice.demuxProbe(st).then(pr => {
        pr.stream.pipe(res);
      }).catch(onError);
    }).catch(onError);

  } catch (e) {
    console.log("[ERROR /audio2] " + e);
    res.sendStatus(500);
  }
});

app.get("/validate", (req, res) => {
  console.log(">> /validate " + JSON.stringify(req.query));

  try {
    let videourl = decodeURIComponent(req.query.u);
  
    ytdl.getBasicInfo(videourl).then(i => {
      res.sendStatus(200);
    }).catch(e => {
      console.error(e);
      res.sendStatus(400);
    });  
  } catch (e) {
    console.log("[ERROR /validate] " + e);
    res.sendStatus(500);
  }
});

app.get("/info", (req, res) => {
  console.log(">> /info " + JSON.stringify(req.query));

  try {
    let videourl = decodeURIComponent(req.query.u);
    let fields = (req.query.f ? req.query.f.split(",") : "");
  
    ytdl.getBasicInfo(videourl).then(i => {
      if (fields.length <= 0) {
        res.send(JSON.stringify(i.videoDetails)); 
      } else {
        let _r = {};
        for (let o in i.videoDetails) {
          if (fields.includes(o.toString())) {
            _r[o] = i.videoDetails[o];
          }
        }
        
        res.send(JSON.stringify(_r));
      }
    }).catch(e => {
      res.sendStatus(400);
    });
  } catch (e) {
    console.log("[ERROR /info] " + e);
    res.sendStatus(500);
  }
});

app.listen(port, () => {
    console.log(">> api-radiobot running on " + port + ".");
    console.log(">> loaded youtube-dl path: " + ytdl_path);
});
