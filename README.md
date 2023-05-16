# Plex Requester Collections

This app automatically creates Collections in Plex Media Server for the content that each user requests in the media request management system Overseerr. It will add a label to all TV Shows and Movies in Plex that a user has requested in Overseerr, using the label format `requester:plex_username`. It will also create Smart Collections for each user containing their requested items. The collections will have labels in the format `owner:plex_username`, which you can use to create sharing restrictions if desired, for example for personalized home screens (need to figure this out).

#### To Do

-   Get working with Plex Meta Manager.
-   Docker image.
-   End goal is to have a Netflix-style recommendation algorithm for my users.

#### Limitations

-   I'm pretty sure Overseerr needs to be using Plex for user authentication, but I haven't tested other setups.
-   It might mess up if you've created your own collections named something like "Movies Requested By plex_username" or "TV Shows Requested By plex_username".
-   Source code provided as is, use at your own risk. Issues and Pull Requests welcomed, but I may not get to them right away.

## Installation

After downloading the source code, install dependencies using NPM:

```bash
npm i
```

## Usage

Add a `.env` file to your root project directory that looks like this:

```bash
NODE_ENV=production
OVERSEERR_URL=http://overseerr-ip-address:5055
OVERSEERR_API_KEY=********************
PLEX_URL=http://plex-server-ip-address:32400
PLEX_TOKEN=********************
```

Build and run with:

```bash
npm start
```

<!--
## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.
-->

## License

[MIT](https://choosealicense.com/licenses/mit/)
