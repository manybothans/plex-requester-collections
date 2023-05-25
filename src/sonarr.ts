/**
 * Contains all the methods required to interact with Sonarr API, as it relates to this project.
 *
 * @author Jess Latimer @manybothans
 *
 * @todo Define types for requests and responses.
 *
 * @remarks
 * Sonarr API docs available at https://sonarr.tv/docs/api/
 */

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { error } from "console";
import _ from "lodash";

/**
 * @typedef {Dictionary} Dictionary - Creates a new type for objects with unknown properties, e.g. responses from undocumented 3rd party APIs.
 */
interface Dictionary {
	[key: string]: unknown | Dictionary;
}

interface SonarrTag {
	id: number;
	label: string;
}
interface SonarrImage {
	coverType: string;
	url: string;
	remoteUrl: string;
}
interface SonarrStatistics {
	seasonCount?: number;
	episodeFileCount: number;
	episodeCount: number;
	totalEpisodeCount: number;
	sizeOnDisk: number;
	releaseGroups: Array<string>;
	percentOfEpisodes: number;
}
interface SonarrSeriesSeasons {
	seasonNumber: number;
	monitored: boolean;
	statistics: SonarrStatistics;
}
interface SonarrAltTitles {
	title: string;
	seasonNumber: number;
}
interface SonarrRatings {
	votes: number;
	value: number;
}
interface SonarrSeriesDetails {
	title: string;
	alternateTitles: Array<SonarrAltTitles>;
	sortTitle: string;
	status: string;
	ended: boolean;
	overview: string;
	previousAiring: string;
	network: string;
	airTime: string;
	images: Array<SonarrImage>;
	seasons: Array<SonarrSeriesSeasons>;
	year: number;
	path: string;
	qualityProfileId: number;
	languageProfileId: number;
	seasonFolder: boolean;
	monitored: boolean;
	useSceneNumbering: boolean;
	runtime: number;
	tvdbId: number;
	tvRageId: number;
	tvMazeId: number;
	firstAired: string;
	seriesType: string;
	cleanTitle: string;
	imdbId: string;
	titleSlug: string;
	rootFolderPath: string;
	certification: string;
	genres: Array<string>;
	tags: Array<number>;
	added: string;
	ratings: SonarrRatings;
	statistics: SonarrStatistics;
	id: number;
}

/**
 * This is the top-level SonarrAPI singleton object.
 */
const SonarrAPI = {
	/**
	 * @property {Array<SonarrTag} Tags - Cached list of all tags in Sonarr.
	 */
	Tags: undefined,
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
	 * @return {Promise<Array<SonarrTag>>} Returns the list of tags from the server.
	 */
	getTags: async function (): Promise<Array<SonarrTag>> {
		this.Tags = await this.callApi({ url: "/tag" });
		if (!_.isArray(this.Tags)) {
			this.Tags = undefined;
		}
		this.debug(this.Tags);
		return this.Tags;
	},
	/**
	 * Create a new tag.
	 *
	 * @remark
	 * In order to reduce calls, If a matching tag exists already, just return it.
	 *
	 * @param {string} tag - The string label for the new tag to create.
	 *
	 * @return {Promise<SonarrTag>} Returns the label and ID of the new tag.
	 */
	createTag: async function (tag: string): Promise<SonarrTag> {
		if (!this.Tags) {
			await this.getTags();
		}
		let tagObj = _.find(this.Tags, (val: SonarrTag) => val.label === tag);
		if (!tagObj) {
			tagObj = await this.callApi({
				url: "/tag",
				method: "post",
				data: {
					label: tag
				}
			});
			await this.getTags();
		}
		this.debug(tagObj);
		return tagObj;
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
	 * @return {Promise<SonarrSeriesDetails>} The details of the updated media item.
	 */
	addTagToMediaItem: async function (
		itemId: number,
		tag: string,
		mediaObject?: SonarrSeriesDetails
	): Promise<SonarrSeriesDetails> {
		const tagDetails = await SonarrAPI.createTag(tag);
		const mediaDetails = mediaObject
			? mediaObject
			: await SonarrAPI.getMediaItem(itemId);
		mediaDetails.tags = _.union(mediaDetails.tags, [tagDetails?.id]);
		const result = SonarrAPI.updateMediaItem(itemId, mediaDetails);
		this.debug(result);
		return result;
	},
	/**
	 * Helper function to get a media item for a given TVDB ID.
	 *
	 * @param {number} tvdbId - The TVDB ID of the media item to search for.
	 *
	 * @return {Promise<SonarrSeriesDetails>} Returns the details of the media item.
	 */
	getMediaItemForTVDBId: async function (
		tvdbId: number
	): Promise<SonarrSeriesDetails> {
		// Get the Radarr item from the TVDB ID, so we can use the Radarr ID.
		const items = await this.getMediaItems(tvdbId);
		const item: SonarrSeriesDetails = _.find(
			items,
			(el) => el?.tvdbId === tvdbId
		);
		this.debug(item);
		return item;
	},
	/**
	 * Get all the media items, or get a single media item matching a TVDB ID.
	 *
	 * @remark
	 * This is useful to translate a TVDB ID from Overseerr or Plex to a Sonarr ID, which is needed for updating a media item.
	 *
	 * @param {number} tvtbId - (Optional) The TVDB ID of the media item to search for.
	 *
	 * @return {Promise<Array<SonarrSeriesDetails>>} Returns the details of the media item.
	 */
	getMediaItems: async function (
		tvtbId?: number
	): Promise<Array<SonarrSeriesDetails>> {
		const request: Dictionary = {
			url: "/series"
		};
		if (tvtbId) request.params = { tvtbId: tvtbId };
		const data = await this.callApi(request);
		this.debug(data);
		return data;
	},
	/**
	 * Get the details for a given media item.
	 *
	 * @param {number} itemId - The ID of the media item you want.
	 *
	 * @return {Promise<SonarrSeriesDetails>} Returns the details of the media item.
	 */
	getMediaItem: async function (
		itemId: number
	): Promise<SonarrSeriesDetails> {
		const data = await this.callApi({
			url: "/series/" + itemId
		});
		this.debug(data);
		return data;
	},
	/**
	 * Update the details of a media item on the server.
	 *
	 * @param {number} itemId - The ID of the media item you want to update.
	 * @param {SonarrSeriesDetails} options - The details you want to update on the media item. Must actually contain the whole series object apparently.
	 *
	 * @return {Promise<SonarrSeriesDetails>} Returns the details of the media item.
	 */
	updateMediaItem: async function (
		itemId: number,
		options: SonarrSeriesDetails
	): Promise<SonarrSeriesDetails> {
		const data = await this.callApi({
			url: "/series/" + itemId,
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
	 * Abstracted API calls to Sonarr, adds URL and API Key automatically.
	 *
	 * @param {AxiosRequestConfig} requestObj - The Axios request config object detailing the desired HTTP request.
	 *
	 * @return {Promise<Dictionary>} The data portion of the response from the Axios HTTP request, or NULL if request failed.
	 */
	callApi: async function (
		requestObj: AxiosRequestConfig
	): Promise<Dictionary> {
		if (!process.env.SONARR_URL || !process.env.SONARR_API_KEY) {
			throw error(
				"Missing .env file containing SONARR_URL and/or SONARR_API_KEY. See README.md"
			);
		}
		try {
			requestObj = requestObj || {};
			requestObj.baseURL = process.env.SONARR_URL + "/api/v3";
			requestObj.params = requestObj.params || {};
			requestObj.headers = {
				"X-Api-Key": process.env.SONARR_API_KEY
			};
			requestObj.method = requestObj.method || "get";

			const start = Date.now();

			const response: AxiosResponse = await axios.request(requestObj);

			const end = Date.now();
			this.debugPerformance(
				`Sonarr Call Time: ${requestObj.url}: ${end - start} ms`
			);

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
	},
	/**
	 * Debugger helper function. Only prints to console if NODE_ENV in .env file is set to "benchmark2".
	 *
	 * @remark
	 * This is for displaying execution time of individual API calls.
	 *
	 * @param {unknown} data - Anything you want to print to console.
	 *
	 * @return None.
	 */
	debugPerformance: function (data: unknown) {
		if (process.env.NODE_ENV == "benchmark2") {
			console.log(data);
		}
	}
};

export default SonarrAPI;
/*
Series Object
{
  title: 'The X-Files',
  alternateTitles: [
    { title: 'X-Files', seasonNumber: -1 },
    { title: 'Akte X', seasonNumber: -1 },
    { title: 'X-Files : Aux frontieres du reel', seasonNumber: -1 },
    { title: 'Expediente X', seasonNumber: -1 }
  ],
  sortTitle: 'xfiles',
  status: 'ended',
  ended: true,
  overview: "`The truth is out there,' and FBI agents Scully and Mulder seek it in this sci-fi phenomenon about their quest to explain the seemingly unexplainable. Their strange cases include UFO sightings, alien abductions and just about anything else paranormal.",
  previousAiring: '2018-03-22T00:00:00Z',
  network: 'FOX',
  airTime: '20:00',
  images: [
    {
      coverType: 'banner',
      url: '/MediaCover/133/banner.jpg?lastWrite=638102862660990861',
      remoteUrl: 'https://artworks.thetvdb.com/banners/graphical/61-g.jpg'
    },
    {
      coverType: 'poster',
      url: '/MediaCover/133/poster.jpg?lastWrite=638012029348167995',
      remoteUrl: 'https://artworks.thetvdb.com/banners/posters/77398-2.jpg'
    },
    {
      coverType: 'fanart',
      url: '/MediaCover/133/fanart.jpg?lastWrite=638102862662020870',
      remoteUrl: 'https://artworks.thetvdb.com/banners/fanart/original/77398-4.jpg'
    }
  ],
  seasons: [
    {
    seasonNumber: 0,
    monitored: false,
    statistics: {
      episodeFileCount: 0,
      episodeCount: 0,
      totalEpisodeCount: 7,
      sizeOnDisk: 0,
      releaseGroups: [],
      percentOfEpisodes: 0
    }
  }
  ],
  year: 1993,
  path: '/data/TV Shows/The X-Files',
  qualityProfileId: 7,
  languageProfileId: 1,
  seasonFolder: true,
  monitored: true,
  useSceneNumbering: false,
  runtime: 45,
  tvdbId: 77398,
  tvRageId: 6312,
  tvMazeId: 430,
  firstAired: '1993-09-10T00:00:00Z',
  seriesType: 'standard',
  cleanTitle: 'thexfiles',
  imdbId: 'tt0106179',
  titleSlug: 'the-x-files',
  rootFolderPath: '/data/TV Shows/',
  certification: 'TV-14',
  genres: [
    'Crime',
    'Drama',
    'Fantasy',
    'Horror',
    'Mystery',
    'Science Fiction',
    'Suspense',
    'Thriller'
  ],
  tags: [],
  added: '2022-10-12T19:54:00.807484Z',
  ratings: { votes: 0, value: 0 },
  statistics: {
    seasonCount: 11,
    episodeFileCount: 217,
    episodeCount: 217,
    totalEpisodeCount: 225,
    sizeOnDisk: 83327787182,
    releaseGroups: [
      'Sum',        'Modern',
      'COPS',       'd3g',
      'Obfuscated', 'D',
      'Monster',    'SHORTBREHD'
    ],
    percentOfEpisodes: 100
  },
  id: 133
}

*/
