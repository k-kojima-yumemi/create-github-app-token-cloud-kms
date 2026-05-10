import { setFailed } from "../actions-wrapper/log";
import { post } from "../minimal/post";

/* v8 ignore next */
post().catch((error) => {
  if (error instanceof Error) {
    setFailed(error);
  }
});
