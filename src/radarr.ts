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
type Dictionary = {
	[key: string]: unknown | Dictionary;
};

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
	 * @return {Promise<Array<Dictionary>>} Returns the list of tags from the server.
	 */
	getTags: async function (): Promise<Array<Dictionary>> {
		const data = await this.callApi({ url: "/tag" });
		this.debug(data);
		return data;
	},
	/**
	 * Create a new tag.
	 *
	 * @param {string} tag - The string label for the new tag to create.
	 *
	 * @return {Promise<Dictionary>} Returns the label and ID of the new tag.
	 */
	createTag: async function (tag: string): Promise<Dictionary> {
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
	 * @param {number} itemId - The ID of the media item you want.
	 * @param {string} tag - The string label of the tag you want to add.
	 *
	 * @return {Promise<Dictionary>} The details of the updated media item.
	 */
	addTagToMediaItem: async function (
		itemId: number,
		tag: string
	): Promise<Dictionary> {
		const tagDetails = await RadarrAPI.createTag(tag);
		const movieDetails = await RadarrAPI.getMediaItem(itemId);
		movieDetails.tags = _.union(movieDetails.tags, [tagDetails?.id]);
		const result = RadarrAPI.updateMediaItem(itemId, movieDetails);
		this.debug(result);
		return result;
	},
	/**
	 * Get the details for a given media item.
	 *
	 * @param {number} itemId - The ID of the media item you want.-=
	 *
	 * @return {Promise<Dictionary>} Returns the details of the media item.
	 */
	getMediaItem: async function (itemId: number) {
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
	 * @param {Dictionary} options - The details you want to update on the media item. Must actually contain the whole movie object apparently.
	 *
	 * @return {Promise<Dictionary>} Returns the details of the media item.
	 */
	updateMediaItem: async function (
		itemId: number,
		options
	): Promise<Dictionary> {
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
