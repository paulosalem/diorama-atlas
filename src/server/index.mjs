import { createAtlasServer } from "./app.mjs";

const port = Number(process.env.PORT || 4183);
const server = await createAtlasServer();

server.listen(port, "127.0.0.1", () => {
  console.log(
    `Diorama Atlas server listening on http://127.0.0.1:${server.address().port}`,
  );
});
