const express = require("express");
const speech = require("@google-cloud/speech");
const jwt = require("jsonwebtoken");
const {
  jwt: { algorithm, public, private, issuer, audience },
} = require("./config/variables");
//use logger

//use body parser
const bodyParser = require("body-parser");

//use corrs
const cors = require("cors");

const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

app.use(bodyParser.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const speechClient = new speech.SpeechClient();
const port = process.env.PORT || 8081;

// io.use((socket, next) => {
//   console.log("socket.handshake.query: ", socket.handshake.auth);
//   if (socket.handshake.auth && socket.handshake.auth.token) {
//     jwt.verify(
//       socket.handshake.auth.token,
//       public,
//       { algorithms: [algorithm] },
//       (err, decoded) => {
//         if (err) return next(new Error("Authentication error"));
//         console.log({ decoded });
//         socket.decoded = decoded;
//         next();
//       }
//     );
//   } else {
//     next(new Error("Authentication error"));
//   }
// });

io.on("connection", (socket) => {
  console.log("a user connected");
  let recognizeStream = null;
  console.log("** a user connected - " + socket.id + " **\n");

  socket.use((packet, next) => {
    console.log("packet: " + packet);
    next();
  });

  socket.on("disconnect", () => {
    console.log("** user disconnected ** \n");
    stopRecognitionStream();
  });

  socket.on("send_message", (message) => {
    console.log("message: " + message);
    setTimeout(() => {
      io.emit("receive_message", "got this message" + message);
    }, 1000);
  });

  socket.on("startGoogleCloudStream", function (data) {
    console.log("** starting google cloud stream **\n");
    startRecognitionStream(this, data);
  });

  socket.on("endGoogleCloudStream", function () {
    console.log("** ending google cloud stream **\n");
    stopRecognitionStream();
  });

  socket.on("send_audio_data", async (audioData) => {
    console.log("send_audio_data");
    io.emit("receive_message", "Got audio data");
    if (recognizeStream !== null) {
      try {
        recognizeStream.write(audioData.audio);
      } catch (err) {
        console.log("Error calling google api " + err);
      }
    } else {
      console.log("RecognizeStream is null");
    }
  });

  function startRecognitionStream(client) {
    console.log("* StartRecognitionStream\n");
    try {
      recognizeStream = speechClient
        .streamingRecognize(request)
        .on("error", console.error)
        .on("data", (data) => {
          const result = data.results[0];
          const isFinal = result.isFinal;

          const transcription = data.results
            .map((result) => result.alternatives[0].transcript)
            .join("\n");

          console.log(`Transcription: `, transcription);

          client.emit("receive_audio_text", {
            text: transcription,
            final: isFinal,
          });
        });
    } catch (err) {
      console.error("Error streaming google api " + err);
    }
  }

  function stopRecognitionStream() {
    if (recognizeStream) {
      console.log("* StopRecognitionStream \n");
      recognizeStream.end();
    }
    recognizeStream = null;
  }
});

server.listen(port, () => {
  console.log("WebSocket server listening on port: ", port);
});

// =========================== GOOGLE CLOUD SETTINGS ================================ //

// The encoding of the audio file, e.g. 'LINEAR16'
// The sample rate of the audio file in hertz, e.g. 16000
// The BCP-47 language code to use, e.g. 'en-US'
const encoding = "LINEAR16";
const sampleRateHertz = 16000;
const languageCode = "en-US"; //en-US
const alternativeLanguageCodes = ["en-US", "ko-KR"];

const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    //alternativeLanguageCodes: alternativeLanguageCodes,
    enableWordTimeOffsets: true,
    enableAutomaticPunctuation: true,
    enableWordConfidence: true,
    enableSpeakerDiarization: true,
    diarizationSpeakerCount: 2,
    model: "video",
    //model: "command_and_search",
    useEnhanced: true,
    speechContexts: [
      {
        phrases: ["hello", "안녕하세요"],
      },
    ],
  },
  interimResults: true,
};
