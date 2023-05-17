/**
 * Contains all the methods required to interact with Tautulli API, as it relates to this project.
 *
 * @author Jess Latimer @manybothans
 *
 * @todo Define types for requests and responses.
 *
 * @remarks
 * Tautulli API docs available at https://github.com/Tautulli/Tautulli/wiki/Tautulli-API-Reference
 */

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
// import _ from "lodash";
import dotenv from "dotenv";
dotenv.config();

/**
 * @typedef {Dictionary} Dictionary - Creates a new type for objects with unknown properties, e.g. responses from undocumented 3rd party APIs.
 */
type Dictionary = {
	[key: string]: unknown;
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
	 * @return {Promise<Dictionary>} Object containing response status and requested quote.
	 */
	arnold: async function (): Promise<Dictionary> {
		const data = await this.callApi({
			params: {
				cmd: "arnold"
			}
		});
		this.debug(data);
		return data;
	},
	/**
	 * Returns a list of history items, e.g. Who watched how much of what movie at what time?
	 *
	 * @todo Type defs for options and response.
	 *
	 * @param {Dictionary} params - The query options for which history items to return. "params.cmd" is auto-set to "get_history".
	 *
	 * @return {Promise<Array<Dictionary>} Array containing all the history objects returned by the query, from a nested portion of the HTTP response data object.
	 */
	getHistory: async function (
		params: Dictionary
	): Promise<Array<Dictionary>> {
		params = params || {};
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
