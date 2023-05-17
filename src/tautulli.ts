/**
 * Contains all the methods required to interact with Plex Media Server API, as it relates to this project.
 *
 * @author Jess Latimer @manybothans
 *
 * @todo Define types for Plex API requests and responses.
 *
 * @remarks
 * Tautulli API docs available at https://github.com/Tautulli/Tautulli/wiki/Tautulli-API-Reference
 */

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
// import _ from "lodash";
import dotenv from "dotenv";
dotenv.config();

const TautulliAPI = {
	// Returns Arnold quote
	arnold: async function () {
		const data = await this.callApi({
			params: {
				cmd: "arnold"
			}
		});
		this.debug(data);
		return data;
	},
	// Returns Arnold quote
	getHistory: async function (params) {
		params = params || {};
		params.cmd = "get_history";

		const data = await this.callApi({
			params: params
		});
		this.debug(data?.data?.data);
		return data;
	},
	// Abstracted API calls to Tautulli, adds URL and API Key automatically.
	callApi: async function (requestObj: AxiosRequestConfig) {
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
	debug: function (data) {
		if (process.env.NODE_ENV == "development") {
			console.log(data);
		}
	}
};

export default TautulliAPI;
