
import { HttpServer } from "../packages/http/dist/index.js";

const server = new HttpServer((request, response) => {
  response
    .status(200)
    .header("X-Powered-By", "NOVA Framework")
    .send(`NOVA received ${request.method} ${request.path}`);
});

try {
  await server.start(3100);

  console.log("NOVA Server started on port 3100");

  const result = await fetch("http://127.0.0.1:3100");

  console.log("HTTP Status:", result.status);
  console.log("Response:", await result.text());

  await server.stop();

  console.log("NOVA Server stopped successfully");
} catch (error) {
  console.error("HTTP Server Test Failed:", error);

  await server.stop();

  process.exitCode = 1;
}
