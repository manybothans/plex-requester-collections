/**
 * Contains all the methods required to interact with Tautulli API, as it relates to this project.
 *
 * @author Jess Latimer @manybothans
 *
 * @remarks
 * Tautulli API docs available at https://github.com/Tautulli/Tautulli/wiki/Tautulli-API-Reference
 */

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { error } from "console";
// import _ from "lodash";
import dotenv from "dotenv";
dotenv.config();

/**
 * @typedef {Dictionary} Dictionary - Creates a new type for objects with unknown properties, e.g. responses from undocumented 3rd party APIs.
 */
type Dictionary = {
	[key: string]: unknown | Dictionary;
};

/**
 * @typedef {Object} TautulliHistoryRequestOptions - Type for the history object that gets returned from Tautulli get_history.
 * @property {number} grouping - (Optional) 0 or 1
 * @property {number} include_activity - (Optional) 0 or 1
 * @property {string} user - (Optional) Username of the user you want history for.
 * @property {number} user_id - (Optional) ID of the user you want history for.
 * @property {number} rating_key - (Optional) ID of the media item you want history for (e.g. Movie or Episode).
 * @property {number} parent_rating_key - (Optional) ID of the parent of the media item you want history for (e.g. Season if it was a show).
 * @property {number} grandparent_rating_key - (Optional) ID of the grandparent of the media item you want history for (e.g. Series if it was a show).
 * @property {string} start_date - (Optional) History for the exact date, "YYYY-MM-DD"
 * @property {string} before - (Optional) History before and including the date, "YYYY-MM-DD"
 * @property {string} after - (Optional) History after and including the date, "YYYY-MM-DD"
 * @property {number} section_id - (Optional) Plex library section ID (I think).
 * @property {string} media_type - (Optional) The type of media item you want history for. Possible values: "movie", "episode", "track", "live", "collection", "playlist"
 * @property {string} transcode_decision - (Optional) "direct play", "copy", "transcode",
 * @property {string} guid - (Optional) Plex guid for an item, e.g. "com.plexapp.agents.thetvdb://121361/6/1"
 * @property {string} order_column - (Optional) "date", "friendly_name", "ip_address", "platform", "player", "full_title", "started", "paused_counter", "stopped", "duration"
 * @property {string} order_dir - (Optional) "desc" or "asc"
 * @property {number} start - (Optional) Pagination option, Row to start from, default 0.
 * @property {number} length - (Optional) Pagination option, Number of items to return, default 25.
 * @property {string} search - (Optional) A string to search for, "Thrones"
 */
type TautulliHistoryRequestOptions = {
	grouping?: number;
	include_activity?: number;
	user?: string;
	user_id?: number;
	rating_key?: number;
	parent_rating_key?: number;
	grandparent_rating_key?: number;
	start_date?: string;
	before?: string;
	after?: string;
	section_id?: number;
	media_type?: string;
	transcode_decision?: string;
	guid?: string;
	order_column?: string;
	order_dir?: string;
	start?: number;
	length?: number;
	search?: string;
};

/**
 * @typedef {Object} TautulliHistoryObject - Type for the history object that gets returned from Tautulli get_history.
 * @property {number} reference_id -
 * @property {number} row_id -
 * @property {number} id - ID of this history object.
 * @property {number} date -
 * @property {number} started -
 * @property {number} stopped -
 * @property {number} duration -
 * @property {number} play_duration -
 * @property {number} paused_counter -
 * @property {number} user_id - ID of the user who watched this item.
 * @property {string} user - Username of the user who watched this item.
 * @property {string} friendly_name - Display name of the user who watched this item.
 * @property {string} user_thumb - Thumbnail image for user who watched this item.
 * @property {string} platform -
 * @property {string} product -
 * @property {string} player -
 * @property {string} ip_address -
 * @property {number} live -
 * @property {string} machine_id -
 * @property {string} location -
 * @property {number} secure -
 * @property {number} relayed -
 * @property {string} media_type -
 * @property {number} rating_key - ID of the media item that was watched. (e.g. Movie or Episode)
 * @property {string} parent_rating_key - ID of the parent of the media item that was watched (e.g. Season if it was a show)
 * @property {string} grandparent_rating_key - ID of the grandparent of the media item that was watched (e.g. Series if it was a show)
 * @property {string} full_title -
 * @property {string} title -
 * @property {string} parent_title -
 * @property {string} grandparent_title -
 * @property {string} original_title -
 * @property {number} year - The year that this media item was released.
 * @property {string} media_index -
 * @property {string} parent_media_index -
 * @property {string} thumb -
 * @property {string} originally_available_at -
 * @property {string} guid -
 * @property {string} transcode_decision -
 * @property {number} percent_complete -
 * @property {number} watched_status -
 * @property {number} group_count -
 * @property {string} group_ids -
 * @property {unknown} state -
 * @property {unknown} session_key -
 */
type TautulliHistoryObject = {
	reference_id: number;
	row_id: number;
	id: number;
	date: number;
	started: number;
	stopped: number;
	duration: number;
	play_duration: number;
	paused_counter: number;
	user_id: number;
	user: string;
	friendly_name: string;
	user_thumb: string;
	platform: string;
	product: string;
	player: string;
	ip_address: string;
	live: number;
	machine_id: string;
	location: string;
	secure: number;
	relayed: number;
	media_type: string;
	rating_key: number;
	parent_rating_key: string;
	grandparent_rating_key: string;
	full_title: string;
	title: string;
	parent_title: string;
	grandparent_title: string;
	original_title: string;
	year: number;
	media_index: string;
	parent_media_index: string;
	thumb: string;
	originally_available_at: string;
	guid: string;
	transcode_decision: string;
	percent_complete: number;
	watched_status: number;
	group_count: number;
	group_ids: string;
	state: unknown;
	session_key: unknown;
};

/**
 * This is the top-level TautulliAPI singleton object.
 */
const TautulliAPI = {
	/**
	 * Returns an Arnold quote, useful for pinging.
	 *
	 * @remarks
	 * Who is your daddy and what does he do?
	 *
	 * @return {Promise<string>} Arnold quote.
	 */
	arnold: async function (): Promise<string> {
		const data = await this.callApi({
			params: {
				cmd: "arnold"
			}
		});
		this.debug(data?.data);
		return data;
	},
	/**
	 * Returns a list of history items, e.g. Who watched how much of what movie at what time?
	 *
	 * @todo Type defs for options and response.
	 *
	 * @param {TautulliHistoryRequestOptions} searchOptions - The query options for which history items to return. "params.cmd" is auto-set to "get_history".
	 *
	 * @return {Promise<Array<TautulliHistoryObject>} Array containing all the history objects returned by the query, from a nested portion of the HTTP response data object.
	 */
	getHistory: async function (
		searchOptions: TautulliHistoryRequestOptions
	): Promise<Array<TautulliHistoryObject>> {
		// Re-type to Dictionary in order to include cmd field, which we don't want to be able to set externally.
		const params: Dictionary = <Dictionary>searchOptions || <Dictionary>{};
		params.cmd = "get_history";

		const data = await this.callApi({
			params: params
		});
		this.debug(data?.data?.data);
		return data;
	},
	/**
	 * Abstracted API calls to Tautulli, adds URL and API Key automatically.
	 *
	 * @param {AxiosRequestConfig} requestObj - The Axios request config object detailing the desired HTTP request.
	 *
	 * @return {Promise<Dictionary>} The data portion of the response from the Axios HTTP request, or NULL if request failed.
	 */
	callApi: async function (
		requestObj: AxiosRequestConfig
	): Promise<Dictionary> {
		if (!process.env.TAUTULLI_URL || !process.env.TAUTULLI_API_KEY) {
			throw error(
				"Missing .env file containing TAUTULLI_URL and/or TAUTULLI_API_KEY. See README.md"
			);
		}
		try {
			requestObj = requestObj || {};
			requestObj.baseURL = process.env.TAUTULLI_URL + "/api/v2";
			requestObj.params = requestObj.params || {};
			requestObj.params["apikey"] = process.env.TAUTULLI_API_KEY;
			requestObj.method = requestObj.method || "get";

			const response: AxiosResponse = await axios.request(requestObj);
			// this.debug(response);
			return response?.data?.response;
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

export default TautulliAPI;
/*
History object
  {
    reference_id: 3442,
    row_id: 3443,
    id: 3443,
    date: 1679829064,
    started: 1679825834,
    stopped: 1679830246,
    duration: 4363,
    play_duration: 4363,
    paused_counter: 44,
    user_id: 3489789,
    user: 'dmacpher',
    friendly_name: 'dmacpher',
    user_thumb: 'https://plex.tv/users/a9260027df5045a5/avatar?c=1681167516',
    platform: 'iOS',
    product: 'Plex for iOS',
    player: 'iPhone',
    ip_address: '207.148.176.228',
    live: 0,
    machine_id: '8CEE20FA-36F3-4194-9C11-F8AAF07A5A1E',
    location: 'wan',
    secure: 1,
    relayed: 0,
    media_type: 'movie',
    rating_key: 22075,
    parent_rating_key: '',
    grandparent_rating_key: '',
    full_title: 'The Hunt for Red October',
    title: 'The Hunt for Red October',
    parent_title: '',
    grandparent_title: '',
    original_title: '',
    year: 1990,
    media_index: '',
    parent_media_index: '',
    thumb: '/library/metadata/22075/thumb/1679021257',
    originally_available_at: '1990-03-02',
    guid: 'plex://movie/5d776829999c64001ec2d13c',
    transcode_decision: 'transcode',
    percent_complete: 98,
    watched_status: 1,
    group_count: 2,
    group_ids: '3442,3443',
    state: null,
    session_key: null
  }

*/
