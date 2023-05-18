/**
 * Contains all the methods required to interact with Overseerr request managemenet API, as it relates to this project.
 *
 * @author Jess Latimer @manybothans
 *
 * @todo Define types for requests and responses.
 *
 * @remarks
 * Overseerr API docs available at https://api-docs.overseerr.dev
 */

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import _ from "lodash";
import dotenv from "dotenv";
import { error } from "console";
dotenv.config();

/**
 * @typedef {Dictionary} Dictionary - Creates a new type for objects with unknown properties, e.g. responses from undocumented 3rd party APIs.
 * @typedef {DictionaryObj} DictionaryObj - Creates a new type for objects with unknown properties and nested object, e.g. responses from undocumented 3rd party APIs.
 */
type Dictionary = {
	[key: string]: unknown;
};
type DictionaryObj = {
	[key: string]: Dictionary;
};

/**
 * @typedef {Object} OverseerrPaginationOptions - Creates a new Type for the Plex collection creation options.
 * @property {number} take - (Optional) Max number of items returned per page.
 * @property {number} skip - (Optional)  Number of items to skip, not pages.
 * @property {string} filter - (Optional) Request statuses to include. Available values : all, approved, available, pending, processing, unavailable, failed.
 * @property {string} sort - (Optional) How to sort the results. Available values : added, modified.
 */
type OverseerrPaginationOptions = {
	take?: number;
	skip?: number;
	filter?: string;
	sort?: string;
};

/**
 * Defualt max number of results to return per page.
 */
const PAGINATION_MAX_SIZE = 100;

/**
 * This is the top-level OverseerrAPI singleton object.
 */
const OverseerrAPI = {
	/**
	 * Returns the current Overseerr status in a JSON object.
	 *
	 * @return {Promise<Dictionary>} Object containing status of Overseerr instance.
	 */
	getStatus: async function (): Promise<Dictionary> {
		const data = await this.callApi({ url: "/status" });
		this.debug(data);
		return data;
	},
	/**
	 * Returns one page of media request objects, based on provided pagination options.
	 *
	 * @remarks
	 * Returns all requests if the user has the ADMIN or MANAGE_REQUESTS permissions. Otherwise, only the logged-in user's requests are returned.
	 * If the requestedBy parameter is specified, only requests from that particular user ID will be returned.
	 *
	 * @param {OverseerrPaginationOptions} params - Pagination options for the request. See Type Definition for details.
	 *
	 * @return {Promise<Dictionary>} The data portion of the HTTP response, containing info on the returned page of results and the page of resuts themselves.
	 */
	getPaginatedRequests: async function (
		params: OverseerrPaginationOptions = <OverseerrPaginationOptions>{}
	): Promise<Dictionary> {
		params.take = params.take || PAGINATION_MAX_SIZE; // Max number of items returned per page
		params.skip = params.skip || 0; // "skip" is number of items, not pages.
		params.filter = params.filter || "available"; // Available values : all, approved, available, pending, processing, unavailable, failed
		params.sort = params.sort || "added"; // Available values : added, modified

		const data = await this.callApi({
			url: "/request",
			params: params
		});
		this.debug(data);
		return data;
	},
	/**
	 * Returns all request objects from the system, based on provided filter string. Loops through paginated results to build full collection of requests.
	 *
	 * @todo Fix type type declarations
	 *
	 * @param {string} filter - (Optional) Request statuses to include. Available values : all, approved, available (default), pending, processing, unavailable, failed.
	 *
	 * @return {Promise<Array<DictionaryObj>>} An array containing all the request objects that match the filter.
	 */
	getAllRequests: async function (
		filter = "available"
	): Promise<Array<DictionaryObj>> {
		let data = await this.getPaginatedRequests({
			filter: filter,
			skip: 0,
			take: PAGINATION_MAX_SIZE
		});
		// Total number of pages we need to cycle through
		const pageCount: number =
			data && data.pageInfo && data.pageInfo.pages
				? data.pageInfo.pages
				: 0;
		// Number of results per page to expect (could be less on last page)
		const pageSize: number =
			data && data.pageInfo && data.pageInfo.pageSize
				? data.pageInfo.pageSize
				: 0;
		// Total number of results to expect across all pages.
		const totalCount: number =
			data && data.pageInfo && data.pageInfo.results
				? data.pageInfo.results
				: 0;
		// Current page we're looking at (starts at 1)
		let currentPage: number =
			data && data.pageInfo && data.pageInfo.page
				? data.pageInfo.page
				: 0;
		// Grab the results from first page before cycling through remaining pages.
		let requests = [];
		requests = _.unionBy(
			requests,
			data && data.results && data.results.length ? data.results : [],
			"id"
		);

		// If all the results are in the first page, don't try to get more pages.
		if (requests.length < totalCount) {
			while (currentPage < pageCount) {
				data = await this.getPaginatedRequests({
					filter: filter,
					skip: currentPage * pageSize,
					take: pageSize
				});

				currentPage =
					data && data.pageInfo && data.pageInfo.page
						? data.pageInfo.page
						: 0;

				requests = _.unionBy(
					requests,
					data && data.results && data.results.length
						? data.results
						: [],
					"id"
				);

				if (requests.length == totalCount) {
					break;
				}
			}
		}
		this.debug(requests);
		return requests;
	},
	/**
	 * Abstracted API calls to Overseerr, adds URL and API Key automatically.
	 *
	 * @param {AxiosRequestConfig} requestObj - The Axios request config object detailing the desired HTTP request.
	 *
	 * @return {Promise<Dictionary>} The data portion of the response from the Axios HTTP request, or NULL if request failed.
	 */
	callApi: async function (
		requestObj: AxiosRequestConfig
	): Promise<Dictionary> {
		if (!process.env.OVERSEERR_URL || !process.env.OVERSEERR_API_KEY) {
			throw error(
				"Missing .env file containing OVERSEERR_URL and/or OVERSEERR_API_KEY. See README.md"
			);
		}
		try {
			requestObj = requestObj || {};
			requestObj.baseURL = process.env.OVERSEERR_URL + "/api/v1";
			requestObj.headers = {
				"X-Api-Key": process.env.OVERSEERR_API_KEY
			};
			requestObj.method = requestObj.method || "get";

			const response: AxiosResponse = await axios.request(requestObj);
			// this.debug(response);
			return response.data;
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

export default OverseerrAPI;
