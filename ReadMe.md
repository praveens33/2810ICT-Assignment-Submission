.1 Server-Side Data Structures (MongoDB Collections)
The backend leverages MongoDB in a binary format called BSON, for the developer, the data is structured and handled as if it were a simple JSON object, MongoDB takes care of the conversion.
users Collection: This collection is the master record for every user in the system. Each user document serves as a central hub of identity and associations.
Structure:
•	_id: ObjectId. Unique auto-generated primary key for the document.
•	username: String.
•	email: String - must be unique.
•	password: String - A securely hashed version of the user's password using bcryptjs. Plain-text passwords are never stored to ensure security.
•	roles: Array<String> -  array defining the user's authorization level. Common values are ['User'], ['User', 'Group Admin'], or ['User', 'Super Admin'].
•	groups: Array<ObjectId> - An array of ObjectIds that reference the groups the user is a member of.
•	channels: Array<ObjectId> - An array of ObjectIds that reference the channels the user is a member of. This provides a quick lookup for channel membership without needing to traverse the group relationship first.
•	profilePicture: String - A URL path to the user's uploaded profile picture.
•	createdAt: Date - Timestamp of when the user account was created.
Relationships: The data is denormalized for performance, what this means is that data is duplicated for efficiency. For example,  if the user “Bob” is in group A, in  the user document, the “groups” field will show that group A is contained in it, while in group A’s user document, Bob’s user_id will be stored in the “members” field. This format allows for efficient queries to find all groups for a user, or all users for a group, because if all data was normalized completely,  to do something like displaying the first 50 messages for a channel_id, the messages table would only have the author_id, but not username, and profilepicture, thus another query, and than all this data has to be joined. This is called the “N+1 Query problem”,  to avoid this a denormalized approach is used.
The groups and channels arrays create direct many-to-many links, allowing for efficient queries to find all groups for a user, or all users in a group.
groups Collection: This collection defines the chatgroups, which users can send messages in.
Structure:
•	_id: ObjectId - The unique primary key.
•	name: String - The public name of the group.
•	admins: Array<ObjectId> - A list of user._ids for users who have administrative privileges over this group.
•	members: Array<ObjectId> - A complete list of user._ids for all members of the group.
•	requests: Array<ObjectId> - A list of user._ids for users who have requested to join the group, pending approval.
•	bannedUsers: Array<ObjectId> - A list of user._ids for users who are permanently banned from this group.
•	channels: Array<ObjectId> - A list of channel._ids that belong to this group.
•	createdAt: Date - Timestamp of group creation.
Relationships: Tightly coupled with the users collection through the admins, members, requests, and bannedUsers arrays. It has a one-to-many relationship with the channels collection.

channels Collection: Represents the individual chat rooms within a group.
Structure:
•	_id: ObjectId - The unique primary key.
•	name: String - The name of the channel.
•	groupId: ObjectId - A reference to the _id of the parent group document.
•	createdAt: Date - Timestamp of channel creation.
Relationships: A channel belongs to exactly one group, forming a classic one-to-many relationship managed via the groupId reference.
messages Collection: Stores the content of all conversations.
Structure:
•	_id: ObjectId - The unique primary key.
•	text: String - The textual content of the message.
•	username: String - The username of the user who sent the message. This is denormalized for quick display.
•	channelId: ObjectId - A reference to the _id of the channel where the message was posted.
•	imageUrl: String (Optional) - A URL path to an image if the message is an image upload.
•	createdAt: Date - The timestamp when the message was sent, crucial for sorting.
Relationships: A message belongs to one channel and is sent by one user (referenced by username)
1.1.1	Git Repo usage
My gitrepo is structured as a monorepo containing both frontend and backend, the assignment directory contains the front end code and the chat-server folder contains the backend code. Used conventional commit messages, directories are  ogically organized, src/ contains source code for the front end application, src/app/ contains all components, services and models, while chat-server is organized into Controllers folder, middleware folder, routes, and test folders.
1.2. Client-Side Data Structures (Angular Models/Interfaces)
The Angular frontend uses TypeScript interfaces (primarily in chat.ts and user.model.ts) to ensure type safety and provide a predictable structure for data flowing from the server. 
User Model:
Structure: Mirrors the server's user document but explicitly excludes the password field for security. It includes _id, username, email, roles, groups, channels, and profilePicture.
Group Interface:
Structure: An exact replica of the group document from the server, with all fields typed appropriately (e.g., _id: string, admins: string[]).
Channel Interface:
Structure: Matches the channel document structure (_id, name, groupId).
Message Interface:
Structure: Matches the message document structure but includes an important optional property: author?: { profilePicture?: string; }. This property is not stored in the database but is populated by the server during the $lookup (aggregation) stage when fetching message history. This is a key optimization to avoid the client having to make separate requests for each user's profile picture.











2.1. Server Responsibilities (The Authoritative Core)
The Node.js/Express backend has authority over data and rules, the client has a copy of data to display, this ensures users cannot corrupt data by manipulating front end code.
API Provision (RESTful & WebSocket):
REST API: The server has a set of  predefined URLs or endpoints, in which the client can send HTTP request, the request has the information required for the CRUD operation. For example, the request when a group admin creates a group contains the name , as well as the user’s id, the adminID is set and defined from the request (req.user._id). All data is exchanged in JSON format.
WebSocket API:  The server runs a Socket.IO instance for real time communication, it is attached to the Node.js http server,  it listens for regular http requests and websocket connections made on the same port. For real-time communication, the server runs a Socket.IO instance. This is used for instantaneous events like broadcasting new messages, user join/leave notifications, and signaling for video calls.
Business Logic & Data Integrity Enforcement: The server handles logic such as:
If a user is approved for a group, the server ensures their _id is moved from the requests array to the members array in the groups document. At the same time it updates the users own groups and channels array. If a channnl is deleted, the server delets the channel document removing its _id from parent g roup channel array and deleting all messages from message collection.
Authentication & Authorization:
Authentication: The /api/auth routes handle user registration (hashing passwords with bcryptjs) and login (comparing hashed passwords).    It ensures that if the email from the login does not exist from the database or the password does not match the associated users, this means that the incorrect email but a correct password is not sufficient to login or vice versa. After this a token is made, the token is created with jwt.sign(), which signs the payload with the secret key (process.env.JWT_SECRET), the key is stored on the OS. This is done because if the code were to be shared publically,  if the actual key value is there, anyone could create a valid JWTs to impersonate users. Furthermor it offers greater flexibility, as using environment  variables allows for the variable to be configured on each environment without changing application code. The JWT also has a 5h expiriy date.
Authorization:  The middleware functions inspect the req before passing it to the server. The authMiddleware.js file for example, ensures that the the authorisation header is in the incoming request [const token = req.header(‘Authorisaiton’);], if there is no header, then authorisaion is denied. If there is a token then it is verified using the key, the jewt.verifiy() checks if the token has expired, if the signature is valid and then decodes the payload. The rolesMiddleware.js  function is used for determing whether user has the special permission or a task.  The auth middleware validates the JWT on every protected request. The more specific middleware functions then inspect the token's payload (e.g., req.user.roles) to determine if the user has the necessary permissions (e.g., 'Super Admin') to access a particular endpoint.
Static Asset Serving: In a production environment, the server is responsible for serving the bundled, optimized static files (HTML, CSS, JavaScript) of the compiled Angular application.









2.2. Client Responsibilities (The Interactive Presentation Layer)
The angular frontend is taksed with giving the ui to the user.
User Interface (UI) Rendering & State Management:
Rendering: The client's primary job is to render the UI based on the data it receives from the server. It uses Angular components to create a dynamic and interactive user experience.
Client-Side State: The client magages the application view state such as the group select, channel selected, messages displayed, options for user management and so forth. The state is refetched from the server when it is  loaded.
It manages the application's view state, such as which group or channel is currently selected, the text typed into a message box, and the list of currently displayed messages. This state is ephemeral and re-fetched from the server upon page load.
User Interaction & Event Handling:  All user actions such as clicks or keyboard inputs and form submission are transformed into actions that in most cases involves the transmission of data through the server.
API Consumption & Real-Time Event Handling:
API Consumption: The AuthService and ChatService in Angular are dedicated to making HTTP requests to the server's rest Api.
Real-Time Events: The socket service maintains websocket connection, provides messages for emitting to the server, observables are used for components to subscribe to real time events.
3. API Routes and Communication Protocols
3.1 list of routes, parameters, return values, and purpose
Path	Component	Purpose	Guarded By
/login	Login	Displays the login form for users to sign in.	None
/register	Register	Displays the registration form for new users.	None
/chat	ChatView	The main chat interface where users interact in groups and channels.	Authentication
/settings	UserSettings	Change profile pic or delete	Authentication
/admin	GroupDashboard	A dashboard for managing all users, groups, and system settings.	adminGuard 
/video-call	VideoCall	The interface for joining and participating in a video call.	Authentication

Method & Endpoint	Parameters (Body)	Returns	Purpose
POST /api/auth/register	{ username, email, password }	{ token, userId }	Creates a new user account.
POST /api/auth/login	{ email, password }	{ token, user }	Authenticates a user and returns a JWT and user object.



Method & Endpoint	Parameters	Returns	Purpose
GET /api/users	None	User[]	(Admin) Retrieves a list of all users in the system.
POST /api/users	Body: { username, email }	User	(Admin) Creates a new user with a default password.
POST /api/users/profile-picture	FormData: profilePicture	User	Uploads and updates the current user's profile picture.
PUT /api/users/:id/roles	Param: id, Body: { roles }	{ msg }	(Admin) Updates a user's roles (e.g., promote to admin).
DELETE /api/users/:id	Param: id	{ msg }	(Admin) Deletes a specific user from the system.
DELETE /api/users	None	{ msg }	Deletes the currently authenticated user's own account.
Method & Endpoint	Parameters	Returns	Purpose
GET /api/groups	None	Group[]	Retrieves a list of all groups.
POST /api/groups	Body: { name }	Group	(Admin) Creates a new group.
DELETE /api/groups/:groupId	Param: groupId	{ msg }	(Admin) Deletes an entire group.
POST /api/groups/:groupId/requests	Param: groupId	{ msg }	Sends a request to join a private group.
POST /api/groups/:groupId/approve	Param: groupId, Body: { userIdToApprove }	{ msg }	(Admin) Approves a user's request to join a group.
POST /api/groups/:groupId/deny	Param: groupId, Body: { userIdToDeny }	{ msg }	(Admin) Denies a user's request to join a group.
POST /api/groups/:groupId/leave	Param: groupId	{ msg }	Allows the current user to leave a group they are in.
POST /api/groups/:groupId/members	Param: groupId, Body: { userIdToAdd }	{ msg }	(Admin) Forcibly adds a user to a group.
DELETE /api/groups/:groupId/members/:userId	Params: groupId, userId	{ msg }	(Admin) Removes a user from a group.
POST /api/groups/:groupId/ban	Param: groupId, Body: { userIdToBan }	{ msg }	(Admin) Bans a user, removing them from the group and preventing re-entry.
POST /api/groups/:groupId/unban	Param: groupId, Body: { userIdToUnban }	{ msg }	(Admin) Unbans a user, allowing them to request to join again.


Method & Endpoint	Parameters	Returns	Purpose
GET /api/channels/for-group/:groupId	Param: groupId	Channel[]	Retrieves all channels belonging to a specific group.
GET /api/channels/:channelId/history	Param: channelId	Message[]	Retrieves the recent message history for a specific channel.
POST /api/channels/:groupId	Param: groupId, Body: { name }	Channel	(Admin) Creates a new channel within a group.
DELETE /api/channels/:channelId	Param: channelId	{ msg }	(Admin) Deletes a channel.

Event Name	Payload (Data)	Purpose
newMessage	Message	Receives new message that was sent by another user in the current channel.
userNotification	{ text: string }	Receive system-level notification (e.g., "User has joined the channel").
existing-peers	string[] (an array of peer IDs)	Receives a list of other users already in the video call when first joining.
peer-left	string (the peer ID of the user who left)	Receives a notification that another user has disconnected from the video call.




3.2. WebSocket Events (Socket.IO)
The real-time layer is handled by Socket.IO, which enables bidirectional communication.
Client-to-Server Events (Emitters):
joinChannel, { channelId, username}: when the user joins a channel, a socket emits the information that user has joined the channel along with the channel id, and username,  the server uses these to add the users socket to the room indicates by the channelId.
sendMessage, { channelId, username, text, imageUrl? }: the method is used when the message of the user is entered and sent. The server receives the message and puts it in database, afterwards it broadcasts it to all the clients in the channelId room.
join-video-call, { peerId }: it is sentwhen a user joins the video call page, announcing their PeerJS ID to the server.
leave-video-call: Sent when a user leaves the video call page.




Server-to-Client Events (Listeners):
newMessage, (message: Message):  The method that listens to the event of a new message (“newMessage”) is an example of a listener used in the codebase, it is wrapped in “observables”  which handles data over time,  it uses the socket.io method “this.socket.on(‘newMessage’,….)”,  which executs a code when the event (message arriving) occurs, it is then pushed into  observable stream. The client-side ChatViewComponent listens for this and appends the new message to its local messages array in real time.
userNotification, ({ text: string }): this broadcasted by the server to a channel's room to announce events such as a user joining or leaving the channel.
existing-peers, (peerIds: string[]): this is sent by the server to a new video call participant, providing them with the PeerJS IDs of everyone already in the call.
peer-left, (peerId: string): Sent by the server to all video call participants when someone leaves, allowing clients to clean up their remote video stream and connection.
4. Angular Architecture: A Modular and Service-Oriented Design
The Angular frontend is structured following best practices, with a clear separation of concerns into components, services, models, and guards.
4.1. Core Architectural Components
Components (The Views)
ChatViewComponent: The main interface for the chat application. It manages the display of groups, channels, and messages. 
DashboardComponent.
The dashboard component handles the user management which is a privellege of the super admin user only,  the user can search for the names of users in the applications database, the super admin can be promote a user to super admin or group admin and also demote them from super admin or group admin. In addition, the user can also remove the user, and create a new user.
GroupDashboardComponent:
The group dashboard is ascessible to the group admin and the super admin but not a user who is not those roles. The groupadmin and super admin can both add new members to a group, remove a user from the group which does not prevent them from joining again or ban a user from a group which puts them in a list of banned users who cannot send requests to join the group. In addition to these
UserSettingsComponent: A dedicated component for users to manage their own profile, the features include uploading a profile picture or deleting their account. 
VideoCallComponent: A specialized component that handles the complexities of WebRTC peer-to-peer video connections using the PeerJS library, orchestrated by the server's WebSocket signaling. As the component loads the initSocket() method connects to the match maker, and establishes a websocket connection to the signalling server (socket io on port 3000), then it listens for messages from the server for the existing peers on the call, which determines who the new user is too call, it also listens for the event of user disconnecting. The initPeer() method connects to the peerJS server (port 3001), it get a unieque ID from the erver and listens to calls from other users, it also announces arrivals to the matchmaker.








Services (The Logic & Data Hubs): Services are classes, in which there is only one instance of each service (they are “singletons”),  each service has one function.
AuthService (auth.ts): Manages all aspects of authentication, it hold the current user's state in a BehaviorSubject, handles login/logout/register API calls, and manages the Json Web Token in localStorage. It
ChatService (chat.ts):  its main fnction is request-response communication (REST), it communicates directly with the server, the other components such as Dashboard component just calls the service, for example to get groups, it just uses this.chatService.getGroups().
SocketService (socket.ts): is concerned with the management of events, it is separated from the chat.ts code which deals with the transmission of data of the form of getting list, creating items, etc. It is concerned with live events, it provides observable-based methods that allow components to listen to events that occur in real-time and the emiision of events.
Models & Interfaces (The Data Contracts):
TypeScript interface and class definitions (user.model.ts, chat.ts) provide strong typing for all data objects, which significantly reduces bugs and improves developer experience by enabling autocompletion and type-checking.
Routing & Guards (Navigation Control):
Routing Module: it define the application navigation paths (e.g., /chat, /admin, /settings). It maps URLs to specific Angular components.
AdminGuard (admin-guard.ts):   route guard is a function which the angular router runs in order to determine if the user has the permission for accessing the route,  here it asks if there is a user and do the users roles included Super Admin or Group Admin. Before the user can navigate to admin dashboard the guard cheks AuthService to see if the user has those roles, if they do not it redrects.
AuthInterceptor (auth-interceptor.ts): The  HttpInterceptor attaches the user's json web token to the authorisation header of all outbound HTTP reques. This means that the token  and header logic does not need to be repeated in every ChatService method.
5. Client-Server Workflows
This section describes the step-by-step flow of data and UI updates.
5.1. Workflow: User Sends a New Message
1.	Client (UI): the  user types a message into the input field in the ChatViewComponent and clicks "Send".
2.	Client (Component): the sendMessage() method in ChatViewComponent is executed.
3.	Client (Service): the component calls this.socketService.sendMessage() this passes the selectedChannel._id, the current username, and the message text.
4.	Client-to-Server (WebSocket): the SocketService emits a sendMessage event over the WebSocket connection to the server.
5.	Server (Event Handler): The server's Socket.IO listener for the sendMessage event receives the data.
6.	Server (Database Write): the server creates a new message document with the provided data and a new createdAt timestamp inserts this document into the messages collection in MongoDB.
7.	Server-to-Clients (WebSocket):after saving the message the server broadcasts a newMessage event to all client connected to the channelId room. The payload of this event is the complete message object just saved to the database.
8.	Clients (Service): the SocketService on all listening clients receives the newMessage event the onNewMessage() Observable emits the new message data.
9.	Clients (Component): The ChatViewComponent (which is subscribed to socketService.onNewMessage()) receives the new message.
10.	Clients (UI Update): then the component pushes the new message object into its local messages array, angular changes detection detects the array modification and renders the new message at the bottom of the chat view for all users in the channel without a page refresh.
5.2. Workflow: Admin Approves a Join Request
1.	Client (UI): Group Admin or Super Admin user navigates to the GroupDashboardComponent, selects a group, goes to the 'Requests' tab, and clicks the "Approve" button next to a user's name.
2.	Client (Component): the approveRequest(userId, groupId) method is called in the GroupDashboardComponent.
3.	Client (Service): The component calls this.chatService.approveJoinRequest(userId, groupId).
4.	Client-to-Server (REST API): the ChatService sends a POST request to the /api/groups/:groupId/approve endpoint. The AuthInterceptor automatically attaches the admins JWT to the request header. The request body contains the userIdToApprove.
5.	Server (Middleware): The Express server receives the request. The auth middleware validates the JWT. 
6.	Server (Route Handler): The router queries group collection to find the group check if users id from JWT is in the group’s admin array or if users role includes Super Admin. Then jt queries the channels collection to get a list of all channel._ids associated with the groupId. Then a updateOne operation on the groups collection for the specified groupId. The $pull operator remove userIdToApprove from request array and $addToSet operator used to add the user to members array, then $addToSet is used to add groupId to users group array and $each with $addToSet to put all the channelIds in it.
7.	Server-to-Client (REST API):the server sends a 200 OK success response back to the client.
8.	Client (Component): The subscribe block in the GroupDashboardComponent's approveRequest method receives the success response.
9.	Client (Data Refresh & UI Update): The subscribe block executes code that first checks if there is a group selected in the ui and if the selected group id is the same group id the user it was approved, then the request index is searched for, if the index value is greater than -1 (e.g. if the user was found), it goes to the position of requestIndex and splices it. Then it pushes by making the search in allUsers array to get full user object of the user approved as the parameter









