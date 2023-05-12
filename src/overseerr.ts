import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const OverseerrAPI = {
	// Returns the current Overseerr status in a JSON object.
	getStatus: async function () {
		const data = await this.callApi({ url: "/status" });
		console.log(data);
		return data;
	},
	// Returns all requests if the user has the ADMIN or MANAGE_REQUESTS permissions. Otherwise, only the logged-in user's requests are returned.
	// If the requestedBy parameter is specified, only requests from that particular user ID will be returned.
	getRequests: async function (
		params = {
			take: 20,
			skip: 0,
			filter: "available",
			sort: "added"
		}
	) {
		const data = await this.callApi({
			url: "/request",
			params: params
		});
		console.log(data);
		return data;
	},
	// Abstracted API calls to Overseerr, adds URL and API Key automatically.
	callApi: async function (requestObj) {
		try {
			requestObj.baseURL = process.env.OVERSEERR_URL;
			requestObj.headers = {
				"X-Api-Key": process.env.OVERSEERR_API_KEY
			};
			if (!requestObj.method) requestObj.method = "get";
			const response = await axios.request(requestObj);
			// console.log(response);
			return response.data;
		} catch (error) {
			console.error(error);
			return null;
		}
	}
};

export default OverseerrAPI;
