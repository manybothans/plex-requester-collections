import OverseerrAPI from "./overseerr";
import PlexAPI from "./plex";
import _ from "lodash";

// Wrap in async function in order to use await
(async function app() {
	// PlexAPI.addLabelToMovie(1, 32730, "requester:manybothans");
	// PlexAPI.addLabelToCollection(1, 37973, "requester:manybothans");

	const requests = await OverseerrAPI.getAllRequests();
	const plexSections = await PlexAPI.getSections();
	for (let i = 0; i < plexSections.length; i++) {
		console.log("-----------------------------------------------");
		console.log(`Starting Section: ${plexSections[i]?.title}`);
		console.log("-----------------------------------------------");

		const sectionId = parseInt(plexSections[i]?.key);
		const mediaItems = await PlexAPI.getAllItems(sectionId);
		// console.log(mediaItems);

		for (let j = 0; j < mediaItems.length; j++) {
			const mediaItem = mediaItems[j];
			const request = getRequestForPlexMediaId(
				requests,
				parseInt(mediaItem?.ratingKey)
			);
			if (mediaItem && request) {
				console.log(
					`${mediaItem.title} requested by ${request?.requestedBy?.displayName}`
				);
			}
		}
	}

	// console.log(getRequestForPlexMediaId(requests, 33450));
})();

const getRequestForPlexMediaId = function (requests, plexId) {
	const result = _.find(
		requests,
		(element) => parseInt(element?.media?.ratingKey) === plexId
	);
	return result;
};
