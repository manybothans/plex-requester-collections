import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const OverseerrAPI = {
	getStatus: async function () {
		const data = await this.callApi({ url: "/status" });
		console.log(data);
		return data;
	},
	getRequests: async function (
		params = {
			take: 20,
			skip: 0,
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
