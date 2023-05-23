/**
 * Contains all the methods required to interact with Radarr API, as it relates to this project.
 *
 * @author Jess Latimer @manybothans
 *
 * @todo Define types for requests and responses.
 *
 * @remarks
 * Radarr API docs available at https://radarr.video/docs/api/
 */

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { error } from "console";
import _ from "lodash";
import dotenv from "dotenv";
dotenv.config();

/**
 * @typedef {Dictionary} Dictionary - Creates a new type for objects with unknown properties, e.g. responses from undocumented 3rd party APIs.
 */
interface Dictionary {
	[key: string]: unknown | Dictionary;
}

interface RadarrLanguage {
	id: number;
	name: string;
}
interface RadarrTag {
	id: number;
	label: string;
}
interface RadarrAltTitle {
	sourceType: string;
	movieMetadataId: number;
	title: string;
	sourceId: number;
	votes: number;
	voteCount: number;
	language: Array<RadarrLanguage>;
	id: number;
}
interface RadarrImage {
	coverType: string;
	url: string;
	remoteUrl: string;
}
interface RadarrSingleRating {
	votes: number;
	value: number;
	type: string;
}
interface RadarrRatings {
	imdb: RadarrSingleRating;
	tmdb: RadarrSingleRating;
	metacritic: RadarrSingleRating;
	rottenTomatoes: RadarrSingleRating;
}
interface RadarrQualityProfile {
	id: number;
	name: string;
	source: string;
	resolution: number;
	modifier: string;
}
interface RadarrQualityRevision {
	version: number;
	real: number;
	isRepack: boolean;
}
interface RadarrQuality {
	quality: RadarrQualityProfile;
	revision: RadarrQualityRevision;
}
interface RadarrMediaInfo {
	audioBitrate: number;
	audioChannels: number;
	audioCodec: string;
	audioLanguages: string;
	audioStreamCount: number;
	videoBitDepth: number;
	videoBitrate: number;
	videoCodec: string;
	videoDynamicRangeType: string;
	videoFps: number;
	resolution: string;
	runTime: string;
	scanType: string;
	subtitles: string;
}
interface RadarrMediaFileDetails {
	movieId: number;
	relativePath: string;
	path: string;
	size: number;
	dateAdded: string;
	indexerFlags: number;
	quality: RadarrQuality;
	mediaInfo: RadarrMediaInfo;
	qualityCutoffNotMet: boolean;
	languages: Array<RadarrLanguage>;
	edition: string;
	id: number;
}
interface RadarrCollection {
	title: string;
	tmdbId: number;
	monitored: boolean;
	qualityProfileId: number;
	searchOnAdd: boolean;
	minimumAvailability: string;
	images: Array<RadarrImage>;
	added: string;
	id: number;
}
interface RadarrMediaDetails {
	title: string;
	originalTitle: string;
	originalLanguage: RadarrLanguage;
	alternateTitles: Array<RadarrAltTitle>;
	secondaryYearSourceId: number;
	sortTitle: string;
	sizeOnDisk: number;
	status: string;
	overview: string;
	inCinemas: string;
	physicalRelease: string;
	digitalRelease: string;
	images: Array<RadarrImage>;
	website: string;
	year: number;
	hasFile: boolean;
	youTubeTrailerId: string;
	studio: string;
	path: string;
	qualityProfileId: number;
	monitored: boolean;
	minimumAvailability: string;
	isAvailable: boolean;
	folderName: string;
	runtime: number;
	cleanTitle: string;
	imdbId: string;
	tmdbId: number;
	titleSlug: string;
	certification: string;
	genres: Array<string>;
	tags: Array<number>;
	added: string;
	ratings: RadarrRatings;
	movieFile: RadarrMediaFileDetails;
	collection: RadarrCollection;
	popularity: number;
	id: number;
}

/**
 * This is the top-level RadarrAPI singleton object.
 */
const RadarrAPI = {
	/**
	 * Get the health of Radarr server.
	 *
	 * @return {Promise<Array<Dictionary>>} Returns the health status of the Radarr server instance.
	 */
	getHealth: async function (): Promise<Array<Dictionary>> {
		const data = await this.callApi({ url: "/health" });
		this.debug(data);
		return data;
	},
	/**
	 * Get a list of all the tags configured on the server.
	 *
	 * @return {Promise<Array<RadarrTag>>} Returns the list of tags from the server.
	 */
	getTags: async function (): Promise<Array<RadarrTag>> {
		const data = await this.callApi({ url: "/tag" });
		this.debug(data);
		return data;
	},
	/**
	 * Create a new tag.
	 *
	 * @param {string} tag - The string label for the new tag to create.
	 *
	 * @return {Promise<RadarrTag>} Returns the label and ID of the new tag.
	 */
	createTag: async function (tag: string): Promise<RadarrTag> {
		const data = await this.callApi({
			url: "/tag",
			method: "post",
			data: {
				label: tag
			}
		});
		this.debug(data);
		return data;
	},
	/**
	 * Helper function to add a tag to a media item.
	 *
	 * @remark
	 * This results in 3 different API calls.
	 *
	 * @param {number} itemId - The ID of the media item you want.
	 * @param {string} tag - The string label of the tag you want to add.
	 *
	 * @return {Promise<RadarrMediaDetails>} The details of the updated media item.
	 */
	addTagToMediaItem: async function (
		itemId: number,
		tag: string
	): Promise<RadarrMediaDetails> {
		const tagDetails = await RadarrAPI.createTag(tag);
		const movieDetails = await RadarrAPI.getMediaItem(itemId);
		movieDetails.tags = _.union(movieDetails.tags, [tagDetails?.id]);
		const result = RadarrAPI.updateMediaItem(itemId, movieDetails);
		this.debug(result);
		return result;
	},
	/**
	 * Get all the media items, or get a single media item matching a TMBD ID.
	 *
	 * @remark
	 * This is useful to translate a TMDB ID from Overseerr or Plex to a Radarr ID, which is needed for updating a media item.
	 *
	 * @param {number} tmdbId - (Optional) The TMDB ID of the media item to search for.
	 *
	 * @return {Promise<Array<RadarrMediaDetails>>} Returns the details of the media item.
	 */
	getMediaItems: async function (
		tmdbId?: number
	): Promise<Array<RadarrMediaDetails>> {
		const request: Dictionary = {
			url: "/movie"
		};
		if (tmdbId) request.params = { tmdbId: tmdbId };
		const data = await this.callApi(request);
		this.debug(data);
		return data;
	},
	/**
	 * Get the details for a given media item.
	 *
	 * @param {number} itemId - The ID of the media item you want.
	 *
	 * @return {Promise<RadarrMediaDetails>} Returns the details of the media item.
	 */
	getMediaItem: async function (itemId: number): Promise<RadarrMediaDetails> {
		const data = await this.callApi({
			url: "/movie/" + itemId
		});
		this.debug(data);
		return data;
	},
	/**
	 * Update the details of a media item on the server.
	 *
	 * @param {number} itemId - The ID of the media item you want to update.
	 * @param {RadarrMediaDetails} options - The details you want to update on the media item. Must actually contain the whole movie object apparently.
	 *
	 * @return {Promise<RadarrMediaDetails>} Returns the details of the media item.
	 */
	updateMediaItem: async function (
		itemId: number,
		options: RadarrMediaDetails
	): Promise<RadarrMediaDetails> {
		const data = await this.callApi({
			url: "/movie/" + itemId,
			method: "put",
			params: {
				moveFiles: false
			},
			data: options
		});
		this.debug(data);
		return data;
	},
	/**
	 * Abstracted API calls to Radarr, adds URL and API Key automatically.
	 *
	 * @param {AxiosRequestConfig} requestObj - The Axios request config object detailing the desired HTTP request.
	 *
	 * @return {Promise<Dictionary>} The data portion of the response from the Axios HTTP request, or NULL if request failed.
	 */
	callApi: async function (
		requestObj: AxiosRequestConfig
	): Promise<Dictionary> {
		if (!process.env.RADARR_URL || !process.env.RADARR_API_KEY) {
			throw error(
				"Missing .env file containing RADARR_URL and/or RADARR_API_KEY. See README.md"
			);
		}
		try {
			requestObj = requestObj || {};
			requestObj.baseURL = process.env.RADARR_URL + "/api/v3";
			requestObj.params = requestObj.params || {};
			requestObj.headers = {
				"X-Api-Key": process.env.RADARR_API_KEY
			};
			requestObj.method = requestObj.method || "get";

			const response: AxiosResponse = await axios.request(requestObj);
			// this.debug(response);
			return response?.data;
		} catch (error) {
			console.error(error);
			return null;
		}
	},
	/**
	 * Debugger helper function. Only prints to console if NODE_ENV in .env file is set to "development".
	 *
	 * @param {unknown} data - Anything you want to print to console.
	 *
	 * @return None.
	 */
	debug: function (data: unknown) {
		if (process.env.NODE_ENV == "development") {
			console.log(data);
		}
	}
};

export default RadarrAPI;

/*
Radarr movie object

{
  title: 'Eraser',
  originalTitle: 'Eraser',
  originalLanguage: { id: 1, name: 'English' },
  alternateTitles: [
    {
      sourceType: 'tmdb',
      movieMetadataId: 126,
      title: 'El Protector',
      sourceId: 0,
      votes: 0,
      voteCount: 0,
      language: [Object],
      id: 696
    },
    {
      sourceType: 'tmdb',
      movieMetadataId: 126,
      title: 'Eraser (Eliminador)',
      sourceId: 0,
      votes: 0,
      voteCount: 0,
      language: [Object],
      id: 697
    },
    {
      sourceType: 'tmdb',
      movieMetadataId: 126,
      title: 'Likvidátor',
      sourceId: 0,
      votes: 0,
      voteCount: 0,
      language: [Object],
      id: 698
    },
    {
      sourceType: 'tmdb',
      movieMetadataId: 126,
      title: '毁灭者',
      sourceId: 0,
      votes: 0,
      voteCount: 0,
      language: [Object],
      id: 699
    }
  ],
  secondaryYearSourceId: 0,
  sortTitle: 'eraser',
  sizeOnDisk: 682500913,
  status: 'released',
  overview: "U.S. Marshall John Kruger erases the identities of people enrolled in the Witness Protection Program. His current assignment is to protect Lee Cullen, who's uncovered evidence that the weapons manufacturer she works for has been selling to terrorist groups. When Kruger discovers that there's a corrupt agent within the program, he must guard his own life while trying to protect Lee's.",
  inCinemas: '1996-06-21T00:00:00Z',
  physicalRelease: '1997-03-25T00:00:00Z',
  digitalRelease: '2002-05-10T00:00:00Z',
  images: [
    {
      coverType: 'poster',
      url: '/MediaCover/128/poster.jpg?lastWrite=638177494775101943',
      remoteUrl: 'https://image.tmdb.org/t/p/original/1FUV5ZmEkbxvqwQW0az4tFFOSmo.jpg'
    },
    {
      coverType: 'fanart',
      url: '/MediaCover/128/fanart.jpg?lastWrite=638011964523950319',
      remoteUrl: 'https://image.tmdb.org/t/p/original/8n6ZCFJWwK7UiX7NYuIEvHLRPYG.jpg'
    }
  ],
  website: 'http://www.warnerbros.com/eraser',
  year: 1996,
  hasFile: true,
  youTubeTrailerId: 'GZNhdAuUhpA',
  studio: 'Kopelson Entertainment',
  path: '/data/Movies/Eraser (1996) [x264]',
  qualityProfileId: 7,
  monitored: true,
  minimumAvailability: 'announced',
  isAvailable: true,
  folderName: '/data/Movies/Eraser (1996) [x264]',
  runtime: 115,
  cleanTitle: 'eraser',
  imdbId: 'tt0116213',
  tmdbId: 9268,
  titleSlug: '9268',
  certification: 'R',
  genres: [ 'Action', 'Drama', 'Mystery' ],
  tags: [ 1 ],
  added: '2022-10-12T18:30:03Z',
  ratings: {
    imdb: { votes: 114408, value: 6.2, type: 'user' },
    tmdb: { votes: 1569, value: 6, type: 'user' },
    metacritic: { votes: 0, value: 56, type: 'user' },
    rottenTomatoes: { votes: 0, value: 42, type: 'user' }
  },
  movieFile: {
    movieId: 128,
    relativePath: 'Eraser (1996) [Bluray-720p x264 AAC].mp4',
    path: '/data/Movies/Eraser (1996) [x264]/Eraser (1996) [Bluray-720p x264 AAC].mp4',
    size: 682500913,
    dateAdded: '2022-10-12T18:34:11Z',
    indexerFlags: 0,
    quality: {
		quality: {
			id: 6,
			name: 'Bluray-720p',
			source: 'bluray',
			resolution: 720,
			modifier: 'none'
		},
		revision: { version: 1, real: 0, isRepack: false }
	},
    mediaInfo: {
      audioBitrate: 32011,
      audioChannels: 2,
      audioCodec: 'AAC',
      audioLanguages: 'und',
      audioStreamCount: 1,
      videoBitDepth: 8,
      videoBitrate: 759791,
      videoCodec: 'x264',
      videoDynamicRangeType: '',
      videoFps: 23.976,
      resolution: '1280x528',
      runTime: '1:54:31',
      scanType: 'Progressive',
      subtitles: ''
    },
    qualityCutoffNotMet: false,
    languages: [ [Object] ],
    edition: '',
    id: 127
  },
  collection: {
    title: 'Eraser Collection',
    tmdbId: 985085,
    monitored: false,
    qualityProfileId: 0,
    searchOnAdd: false,
    minimumAvailability: 'tba',
    images: [],
    added: '0001-01-01T08:12:00Z',
    id: 0
  },
  popularity: 19.489,
  id: 128
}


*/
