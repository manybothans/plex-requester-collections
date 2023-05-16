import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import _ from "lodash";
import dotenv from "dotenv";
dotenv.config();

// Overseerr API docs available at
// https://api-docs.overseerr.dev

type OverseerrPaginationOptions = {
	take?: number;
	skip?: number;
	filter?: string;
	sort?: string;
};

const PAGINATION_MAX_SIZE = 100;

const OverseerrAPI = {
	// Returns the current Overseerr status in a JSON object.
	getStatus: async function () {
		const data = await this.callApi({ url: "/status" });
		this.debug(data);
		return data;
	},
	// Returns all requests if the user has the ADMIN or MANAGE_REQUESTS permissions. Otherwise, only the logged-in user's requests are returned.
	// If the requestedBy parameter is specified, only requests from that particular user ID will be returned.
	getPaginatedRequests: async function (
		params = <OverseerrPaginationOptions>{}
	) {
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
	// Loop through paginated results to build full collection of requests.
	getAllRequests: async function (filter = "available") {
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
	// Abstracted API calls to Overseerr, adds URL and API Key automatically.
	callApi: async function (requestObj: AxiosRequestConfig) {
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
	debug: function (data) {
		if (process.env.NODE_ENV == "development") {
			console.log(data);
		}
	}
};

export default OverseerrAPI;
