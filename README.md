# Plex Requester Collections

This app automatically creates Collections in Plex Media Server for the content that each user requests in the media request management system Overseerr. It will add a label to all TV Shows and Movies in Plex that a user has requested in Overseerr, using the label format `requester:plex_username`. It will also create Smart Collections for each user containing their requested items. The collections will have labels in the format `owner:plex_username`, which you can use to create sharing restrictions if desired, for example for personalized home screens (need to figure this out).

If you optionally provide Radarr, Sonarr, and Tautulli connection details in the `.env` file, then the app will also tag items in Radarr/Sonarr with the requester Plex username in the format `requester:plex_username`. If Tautulli shows that the requester has fully watched the item, it will also tag the item in Radarr/Sonarr with `requester_watched` (useful for library pruning). If Overseerr shows that the media item was available over 6 months ago, and Tautulli shows that the requester last watched the item over 3 months ago and didn't finish, then the tag `stale_request` will be added to the item in Radarr/Sonarr.

The process will go through once at start, then repeat every 24 hours. Make sure the services you're connecting to are already running. ;)

#### To Do

-   Get working with Plex Meta Manager.
-   End goal is to have a Netflix-style recommendation algorithm for my users.
-   Add support for users who modify requests, or who haven't requested by are actively watching the content.
-   Add support for removing tags if state changes.
-   Figure out how to have personalized Plex homescreens, different by user.

#### Limitations

-   Only TV Shows and Movies are supported as media types for now.
-   I'm pretty sure Overseerr needs to be using Plex for user authentication, but I haven't tested other setups.
-   It might mess up if you've created your own collections named something like "Movies Requested By plex_username" or "TV Shows Requested By plex_username".
-   Source code provided as is, use at your own risk.

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
    restart: unless-stopped
```

Run the Docker image with:

```bash
docker-compose up -d -f /path/to/docker-compose.yml
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

<!--
Please make sure to update tests as appropriate.
-->

## License

[MIT](https://choosealicense.com/licenses/mit/)
