import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import _ from "lodash";
import dotenv from "dotenv";
dotenv.config();

// Plex API Docs used to build this available at
// https://www.plexopedia.com/plex-media-server/api/library/movie-update/
// Docs are incomplete, but good starting point. I had to do some reverse engineering.

/*
collection add tag
type=18&
id=37973&
includeExternalMedia=1&
titleSort.locked=1&
label.locked=1&
label%5B0%5D.tag.tag=hi&
X-Plex-Product=Plex%20Web&
X-Plex-Version=4.100.1&
X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&
X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&
X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&
X-Plex-Model=bundled&
X-Plex-Device=OSX&
X-Plex-Device-Name=Safari&
X-Plex-Device-Screen-Resolution=1706x2032%2C5120x2160&
X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&
X-Plex-Language=en
*/

/*
create dumb collection
/library/collections
type=1&
title=Test3&
smart=0&
uri=server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fmetadata%2F32730&

uri=server://baaf4cd09f73f07ddc676de067b123704c60cb1f/com.plexapp.plugins.library/library/metadata/32730&

sectionId=1&
X-Plex-Product=Plex%20Web&
X-Plex-Version=4.100.1&
X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&
X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&
X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&
X-Plex-Model=bundled&
X-Plex-Device=OSX&
X-Plex-Device-Name=Safari&
X-Plex-Device-Screen-Resolution=1706x845%2C5120x2160&
X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&
X-Plex-Provider-Version=6.3&
X-Plex-Text-Format=plain&
X-Plex-Drm=fairplay&
X-Plex-Language=en
*/

/*
create dumb colleciton
/library/collections

type=1&
title=Test5&
smart=0&
uri=server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fmetadata%2F32730%2C32694%2C30503&

uri=server://baaf4cd09f73f07ddc676de067b123704c60cb1f/com.plexapp.plugins.library/library/metadata/32730,32694,30503&

sectionId=1&
X-Plex-Product=Plex%20Web&
X-Plex-Version=4.100.1&
X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&
X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&
X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&
X-Plex-Model=bundled&
X-Plex-Device=OSX&
X-Plex-Device-Name=Safari&
X-Plex-Device-Screen-Resolution=1706x845%2C5120x2160&
X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&
X-Plex-Provider-Version=6.3&
X-Plex-Text-Format=plain&
X-Plex-Drm=fairplay&
X-Plex-Language=en

*/

/*

create smart collection
/library/collections

type=1&
title=Test4&
smart=1&
uri=server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fsections%2F1%2Fall%3Ftype%3D1%26sort%3DtitleSort%26label%3D139932&

uri=server://baaf4cd09f73f07ddc676de067b123704c60cb1f/com.plexapp.plugins.library/library/sections/1/all?type=1&sort=titleSort&label=139932&

sectionId=1&
X-Plex-Product=Plex%20Web&
X-Plex-Version=4.100.1&
X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&
X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&
X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&
X-Plex-Model=bundled&
X-Plex-Device=OSX&
X-Plex-Device-Name=Safari&
X-Plex-Device-Screen-Resolution=1706x845%2C5120x2160&
X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&
X-Plex-Provider-Version=6.3&
X-Plex-Text-Format=plain&
X-Plex-Drm=fairplay&
X-Plex-Language=en
*/

/*
create smart collection
/library/collections

type=2&
title=Test6&
smart=1&
uri=server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fsections%2F2%2Fall%3Ftype%3D2%26sort%3DaddedAt%253Adesc%26push%3D1%26show.year%3D2023%26and%3D1%26show.unwatchedLeaves%3D1%26pop%3D1%26and%3D1%26show.label%3D137662&

uri=server://baaf4cd09f73f07ddc676de067b123704c60cb1f/com.plexapp.plugins.library/library/sections/2/all?
type=2&
sort=addedAt%3Adesc&
push=1&
show.year=2023&
and=1&
show.unwatchedLeaves=1&
pop=1&
and=1&
show.label=137662&

sectionId=2&
X-Plex-Product=Plex%20Web&
X-Plex-Version=4.100.1&
X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&
X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&
X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&
X-Plex-Model=bundled&
X-Plex-Device=OSX&
X-Plex-Device-Name=Safari&
X-Plex-Device-Screen-Resolution=1706x845%2C5120x2160&
X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&
X-Plex-Provider-Version=6.3&
X-Plex-Text-Format=plain&
X-Plex-Drm=fairplay&
X-Plex-Language=en

*/

/*
get labels
/library/sections/1/label

X-Plex-Product=Plex%20Web&
X-Plex-Version=4.100.1&
X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&
X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&
X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&
X-Plex-Model=bundled&
X-Plex-Device=OSX&
X-Plex-Device-Name=Safari&
X-Plex-Device-Screen-Resolution=1706x877%2C5120x2160&
X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&
X-Plex-Provider-Version=6.3&
X-Plex-Text-Format=plain&
X-Plex-Drm=fairplay&
X-Plex-Language=en
*/

/*
get gollections
/library/sections/1/collections

includeCollections=1&
includeExternalMedia=1&
X-Plex-Product=Plex%20Web&
X-Plex-Version=4.100.1&
X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&
X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&
X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&
X-Plex-Model=bundled&
X-Plex-Device=OSX&
X-Plex-Device-Name=Safari&
X-Plex-Device-Screen-Resolution=1706x980%2C1920x1080&
X-Plex-Container-Start=50&
X-Plex-Container-Size=108&
X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&
X-Plex-Provider-Version=6.3&
X-Plex-Text-Format=plain&
X-Plex-Drm=fairplay&
X-Plex-Language=en 
 */

// I found these using browser dev console, haven't found the others.
const PlexTypes = {
	MOVIE: 1,
	SERIES: 2,
	COLLECTION: 18
};

const PlexAPI = {
	// Unique ID for the Plex server intance, needed for creating collections
	MachineId: "",
	// This API command is used to get the capabilities of the Plex Media server. The capabilities returned include such items as the settings of the
	// Plex server, the operating system, and the version of Plex that is installed.
	getCapabilities: async function () {
		const data = await this.callApi({ url: "/" });
		this.debug(data);
		return data;
	},
	getMachineId: async function () {
		if (!this.MachineId) {
			const data = await this.getCapabilities();

			// If the returned object has the right fields, grab the identifier
			this.MachineId =
				data &&
				data.MediaContainer &&
				data.MediaContainer.machineIdentifier
					? data.MediaContainer.machineIdentifier
					: "";
		}
		this.debug(this.MachineId);
		return this.MachineId;
	},
	// You can easily retrieve the information about all libraries AKA sections that are available on a Plex server using this API command.
	getSections: async function () {
		const data = await this.callApi({ url: "/library/sections" });
		const sections =
			data && data.MediaContainer && data.MediaContainer.Directory
				? data.MediaContainer.Directory
				: [];
		this.debug(sections);
		return sections;
	},
	// The API command described here can return the information for each account setup on the Plex server.
	getCollections: async function (sectionId: number) {
		const data = await this.callApi({
			url: `/library/sections/${sectionId}/collections`
		});
		const collections =
			data && data.MediaContainer && data.MediaContainer.Metadata
				? data.MediaContainer.Metadata
				: [];
		this.debug(collections);
		return collections;
	},
	// The API command described here can return the information for each account setup on the Plex server.
	getAccounts: async function () {
		const data = await this.callApi({ url: "/accounts" });
		const accounts =
			data && data.MediaContainer && data.MediaContainer.Account
				? data.MediaContainer.Account
				: [];
		this.debug(accounts);
		return accounts;
	},
	// Each Plex server can have multiple accounts created for different users. Information about a single account can be returned using this API command.
	getSingleAccount: async function (accountId: number) {
		const data = await this.callApi({ url: "/accounts/" + accountId });
		const account =
			data &&
			data.MediaContainer &&
			data.MediaContainer.Account &&
			data.MediaContainer.Account[0]
				? data.MediaContainer.Account[0]
				: undefined;
		this.debug(account);
		return account;
	},
	// Get a list of all the labels for this library section, along with label key.
	getLabels: async function (sectionId: number) {
		const data = await this.callApi({
			url: `/library/sections/${sectionId}/label`
		});
		// this.debug(data);
		const labels =
			data && data.MediaContainer && data.MediaContainer.Directory
				? data.MediaContainer.Directory
				: [];
		this.debug(labels);
		return labels;
	},
	// Get a list of all the labels for this library section, along with label key.
	getKeyForLabel: async function (sectionId: number, label: string) {
		const labels = await this.getLabels(sectionId);
		let labelKey: number;

		// Find the specific label in the array and return the corresponding key, otherwise return undefined.
		if (label && labels && _.isArray(labels) && !_.isEmpty(labels)) {
			const labelObj = _.find(labels, { title: label });
			labelKey = labelObj && labelObj.key ? labelObj.key : undefined;
		}
		this.debug(labelKey);
		return labelKey;
	},
	// Alias helper funtion to simplify adding labels to movies.
	addLabelToMovie: async function (
		sectionId: number,
		movieId: number,
		label: string
	) {
		return this.updateItemDetails(sectionId, movieId, {
			"label[0].tag.tag": label,
			"label.locked": 1,
			type: PlexTypes.MOVIE
		});
	},
	// Alias helper funtion to simplify adding labels to collecitons.
	addLabelToCollection: async function (
		sectionId: number,
		collectionId: number,
		label: string
	) {
		return this.updateItemDetails(sectionId, collectionId, {
			"label[0].tag.tag": label,
			"label.locked": 1,
			type: PlexTypes.COLLECTION
		});
	},
	// Returns an array of all the top-level media items (Movies or TV Shows) in a given Section AKA Library.
	getAllItems: async function (sectionId: number) {
		const data = await this.callApi({
			url: `/library/sections/${sectionId}/all`
		});
		// this.debug(data);
		const items =
			data && data.MediaContainer && data.MediaContainer.Metadata
				? data.MediaContainer.Metadata
				: [];
		this.debug(items);
		return items;
	},
	// The movie metadata can be updated from the Plex API. This can be useful if you wish to perform a bulk update to movies in a library.
	updateItemDetails: async function (
		sectionId: number,
		itemId: number,
		updates
	) {
		updates = updates || {};
		updates.type = updates.type || PlexTypes.MOVIE;
		updates.id = itemId;
		updates.includeExternalMedia = 1;

		const data = await this.callApi({
			url: `/library/sections/${sectionId}/all`,
			method: "put",
			params: updates
		});
		this.debug(data);
		return data;
	},
	// Abstracted API calls to Plex, adds URL and API Key automatically.
	callApi: async function (requestObj: AxiosRequestConfig) {
		try {
			requestObj = requestObj || {};
			requestObj.baseURL = process.env.PLEX_URL;
			requestObj.method = requestObj.method || "get";
			requestObj.params = requestObj.params || {};
			requestObj.params["X-Plex-Token"] = process.env.PLEX_TOKEN;

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

export default PlexAPI;
