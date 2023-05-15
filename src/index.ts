import OverseerrAPI from "./overseerr";
import PlexAPI from "./plex";

// Wrap in async function in order to use await
(async function app() {
	OverseerrAPI.getStatus();
	// const requests = await OverseerrAPI.getRequests({ take: 2 });
	// // const requests2 = await OverseerrAPI.getRequests({ skip: 20 });
	// for (let index = 0; index < requests.results.length; index++) {
	// 	console.log(requests.results[index].requestedBy);
	// 	console.log(requests.results[index].media);
	// }
	// PlexAPI.getCapabilities();
	// PlexAPI.getSections();
	PlexAPI.getAllItems(2);
	// PlexAPI.getKeyForLabel(1, "PMM");
	// PlexAPI.getMachineId();
	// PlexAPI.getAccounts();
	// PlexAPI.getSingleAccount(1);
	// PlexAPI.addLabelToMovie(1, 32730, "requester:manybothans");
	// PlexAPI.addLabelToCollection(1, 37973, "requester:manybothans");
})();
