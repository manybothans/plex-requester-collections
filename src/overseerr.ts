import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import dotenv from "dotenv";
dotenv.config();

// Overseerr API docs available at
// https://api-docs.overseerr.dev

type OverseerrPaginationOptions = {
	take: number;
	skip: number;
	filter: string;
	sort: string;
};

const OverseerrAPI = {
	// Returns the current Overseerr status in a JSON object.
	getStatus: async function () {
		const data = await this.callApi({ url: "/status" });
		this.debug(data);
		return data;
	},
	// Returns all requests if the user has the ADMIN or MANAGE_REQUESTS permissions. Otherwise, only the logged-in user's requests are returned.
	// If the requestedBy parameter is specified, only requests from that particular user ID will be returned.
	getRequests: async function (params = <OverseerrPaginationOptions>{}) {
		params.take = params.take || 20; // Max number of items returned per page
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
	// Abstracted API calls to Overseerr, adds URL and API Key automatically.
	callApi: async function (requestObj: AxiosRequestConfig) {
		try {
			requestObj = requestObj || {};
			requestObj.baseURL = process.env.OVERSEERR_URL;
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
