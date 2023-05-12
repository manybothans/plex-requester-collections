import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const OVERSEERR_API_KEY = process.env.OVERSEERR_API_KEY;
const OVERSEERR_URL = process.env.OVERSEERR_URL;

const OverseerrAPI = {
	getStatus: async function () {
		try {
			const response = await axios.get(OVERSEERR_URL + "/status");
			console.log(response.data);
		} catch (error) {
			console.error(error);
		}
	},
	getRequests: async function () {
		try {
			const response = await axios.request({
				method: "get",
				url: "/request",
				baseURL: OVERSEERR_URL,
				headers: {
					"X-Api-Key": OVERSEERR_API_KEY,
				},
				params: {
					take: 20,
					skip: 0,
					sort: "added",
					requestedBy: 1,
				},
			});
			console.log(response.data);
		} catch (error) {
			console.error(error);
		}
	},
};

export default OverseerrAPI;
