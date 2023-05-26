# Plex Requester Collections

This app will tag your media in Plex, Radarr, and Sonarr with the username of the person who requested the media in Overseerr. To assist with library pruning, it can also connect to Tautulli and tag media in Radarr/Sonarr when the requester has fully watched it, or if the requester hasn't watched after a long time.

Read the [Logic Explained](#logic-explained) section below for a detailed explanation of how this is done.

The process will go through once at start, then repeat every 24 hours. Make sure the services you're connecting to are already running. ;)

#### To Do

-   Get working with Plex Meta Manager.
-   End goal is to have a Netflix-style recommendation algorithm for my users.
-   Add support for users who modify requests.
-   Figure out how to have personalized Plex home screens, different by user.

#### Limitations

-   Only TV Shows and Movies are supported as media types for now.
-   I'm pretty sure Overseerr needs to be using Plex for user authentication, but I haven't tested other setups.
-   It might mess up if you've created your own collections named something like "Movies Requested By plex_username" or "TV Shows Requested By plex_username".
-   Source code provided as is, use at your own risk.
-   Due to limitations in Plex and Tautulli, this won't detect when something is _marked_ as watched, the user actually needs to have watched the item in a plex viewing session that was tracked in Tautulli. Working on improving this.

## Installation and Usage

### Local

After downloading the source code, install dependencies using NPM:

```bash
npm i
```

Add a `.env` file to your root project directory that looks like this:

```bash
NODE_ENV=production # Optional - 'development' will give verbose logging.
OVERSEERR_URL=http://overseerr-ip-address:5055
OVERSEERR_API_KEY=********************
PLEX_URL=http://plex-server-ip-address:32400
PLEX_TOKEN=********************
PLEX_INCLUDE_SECTIONS=1,2 # Optional - Comma-Separated, only process these library sections.
RADARR_URL=http://radarr-ip-address:7878 # Optional
RADARR_API_KEY=******************** # Optional
SONARR_URL=http://sonarr-ip-address:8989 # Optional
SONARR_API_KEY=******************** # Optional
TAUTULLI_URL=http://tautulli-ip-address:8181 # Optional
TAUTULLI_API_KEY=******************** # Optional
FEATURE_RUN_ONCE=0 # Optional - 1:Run through once then stop. 0 (default): Repeat every 24h.
FEATURE_CREATE_COLLECTIONS=1 # Optional - 1 (default): Make smart collection for each requester. 0: Just do the tagging.
START_DELAY_MS=0 # Optional - Number of milliseconds to wait before starting the first pass. Useful if you reboot all containers at the same time.
```

Build and run with:

```bash
npm start
```

### Docker-Compose

Create a `docker-compose.yml` file using the following example, except with your service connection details.

```yaml
version: "2.1"
services:
  plex-requester-collections:
    image: manybothans/plex-requester-collections:latest
    container_name: plex-requester-collections
    environment:
      - NODE_ENV=production # Optional - 'development' will give verbose logging.
      - OVERSEERR_URL=http://overseerr-ip-address:5055
      - OVERSEERR_API_KEY=********************
      - PLEX_URL=http://plex-server-ip-address:32400
      - PLEX_TOKEN=********************
      - PLEX_INCLUDE_SECTIONS=1,2 # Optional - Comma-Separated, only process these library sections.
      - RADARR_URL=http://radarr-ip-address:7878 # Optional
      - RADARR_API_KEY=******************** # Optional
      - SONARR_URL=http://sonarr-ip-address:8989 # Optional
      - SONARR_API_KEY=******************** # Optional
      - TAUTULLI_URL=http://tautulli-ip-address:8181 # Optional
      - TAUTULLI_API_KEY=******************** # Optional
      - FEATURE_RUN_ONCE=0 # Optional - 1:Run through once then stop. 0 (default): Repeat every 24h.
      - FEATURE_CREATE_COLLECTIONS=1 # Optional - 1 (default): Make smart collection for each requester. 0: Just do the tagging.
      - START_DELAY_MS=0 # Optional - Number of milliseconds to wait before starting the first pass. Useful if you reboot all containers at the same time.
    restart: unless-stopped
```

Run the Docker image with:

```bash
docker-compose up -d -f /path/to/docker-compose.yml
```

## [Logic Explained](#logic-explained)

-   Plex and Overseerr connection details are required, but Radarr, Sonarr, and Tautulli connection details are optional.
    -   If Radarr and/or Sonarr connection details are provided, then Tautulli connection details are required as well.
-   If a user requests an item in Overseerr, tag the item in Plex with `requester:plex_username`.
-   Unless the environment variable `FEATURE_CREATE_COLLECTIONS` is set to `0`, also create smart collections in Plex for each requester that include the tagged media items, and tag the collection with `owner:plex_username`. These collections will have titles such as `Movies Requested by plex_username` or `TV Shows Requested by plex_username`, and the Sort Titles will have the prefix `zzz_` so the collections appear at the bottom of the list.
-   If Tautulli and Radarr/Sonarr connection details are set in environment variables:
    -   If a user requests an item in Overseerr, tag the item in Radarr/Sonarr with `requester:plex_username`.
    -   If Tautulli shows that a user OTHER THAN the requester has watched the item in the last 3 months, tag the item in Radarr/Sonarr with `others_watching`.
        -   If Tautulli later shows that non-requester users have not watched the item in the last 3 months, remove the `others_watching` tag from the item in Radarr/Sonarr.
    -   If Tautulli shows that the requester user has fully watched an item, tag the item in Radarr/Sonarr with `requester_watched`.
        -   If Tautulli later shows that the requester has no longer fully watched an item (e.g. they had finished a show but new episodes were added), remove the `requester_watched` tag from the item in Radarr/Sonarr.
    -   If Overseerr shows that a requested media item was downloaded over 6 months ago, and Tautulli shows that the requester user hasn't watched the item in over 3 months, AND no one else has watched it in 3 months, tag item in Radarr/Sonarr with `stale_request`.
        -   If Tautulli later shows that the requester user has started watching the item, remove the `stale_request` tag from item in Radarr/Sonarr.
-   The process will run once at start, then repeat every 24 hours, unless the environment variable `FEATURE_RUN_ONCE` is set to `1` in which case it will run through once then exit.
-   Right now the system will only touch media items that exist both in Plex and as requests in Overseerr. If you add items to Plex directly, or bypass Overseerr and request in Radarr/Sonarr directly, those items won't be processed.

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

<!--
Please make sure to update tests as appropriate.
-->

## License

[MIT](https://choosealicense.com/licenses/mit/)
