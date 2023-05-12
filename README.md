# Plex Requester Collections

This app automatically creates Collections in Plex Media Server for the content that each user requests in the media request management system Overseerr.

## Installation

After downloading the source code, install dependencies using NPM:

```bash
npm i
```

## Usage

Add a `.env` file to your root project directory that looks like this:

```bash
NODE_ENV=development
OVERSEERR_API_KEY=********************
OVERSEERR_URL=http://overseerr-example.com:5055/api/v1
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
