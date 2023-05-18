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
