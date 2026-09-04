import "./App.css"
import { Editor } from "@monaco-editor/react"
import { MonacoBinding } from "y-monaco" //so when one user edits the code, the change is synchronized with everyone else's editor in real time.
import { useRef, useMemo, useState, useEffect } from "react"
import * as Y from "yjs" //It imports all exported functions, classes, and objects from the yjs library and groups them under the name Y.
import { SocketIOProvider } from "y-socket.io"

function App() {

  const editorRef = useRef(null) //Initially its value is null.Later, you can store/access the Monaco Editor instance through it.Changing editorRef.current does not cause a React re-render.
  const bindingRef = useRef(null)
  const providerRef = useRef(null)

  const [ username, setUsername ] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || ""
  }) //It initializes the username state with a function that checks the current URL for a query parameter named "username". If it exists, it uses that value; otherwise, it defaults to an empty string. This allows users to join a session with a pre-defined username if provided in the URL.

  const [ users, setUsers ] = useState([]) //It initializes the users state as an empty array. This state will hold the list of currently connected users in the collaborative session.

  const ydoc = useMemo(() => new Y.Doc(), []) //Example: Alice types Hello → ydoc stores that change, so it can be sent to Bob.useMemo(..., []) means React keeps using the same notebook, instead of creating a new one every time.

  const yText = useMemo(() => ydoc.getText("monaco"), [ ydoc ]) //Example: ydoc = shared notebook 📒, and yText = the page inside that notebook where the code is written.


  const handleMount = (editor) => { //Gets the Monaco Editor instance when the editor is created.
    editorRef.current = editor //Stores that editor instance inside editorRef, so you can access it later.

    if (providerRef.current) {
      bindingRef.current = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([ editorRef.current ]),
        providerRef.current.awareness
      )
    }
  }




  const handleJoin = (e) => {//Creates a function to handle the form submission.
    e.preventDefault() //Prevents the browser's default form behavior, which would normally reload the page.
    setUsername(e.target.username.value) //Gets the value entered in the form's username field and updates the React username state.
    window.history.pushState({}, "", "?username=" + e.target.username.value) //Changes the browser URL without reloading the page.



  }

  useEffect(() => { //This effect runs whenever the username state changes.

    console.log(username) //Logs the current username to the console for debugging purposes.

    if (username) { //Only starts the collaboration system if a username exists.

      const provider = new SocketIOProvider(
        "http://localhost:3000",
        "monaco",
        ydoc,
        {
          autoConnect: true,
        }
      ) //Creates a new SocketIOProvider instance, which connects the Yjs document (ydoc) to a Socket.IO server. The provider will synchronize the "monaco" room on the server with the local Yjs document.

      providerRef.current = provider

      provider.awareness.setLocalStateField("user", { username }) //Sets the local user's state in the awareness protocol, allowing other users to know who is currently connected and their username.


      const states = Array.from(provider.awareness.getStates().values()) //Retrieves the current awareness states of all connected users and converts them into an array. Each state contains information about a user, such as their username.

      console.log(states) //Logs the current awareness states to the console for debugging purposes.

      setUsers(states.filter(state => state.user && state.user.username).map(state => state.user)) //Filters the awareness states to only include those with a valid user and username, then maps them to extract just the user information. Finally, it updates the users state with this filtered list of users.

      provider.awareness.on("change", () => { //Sets up an event listener that triggers whenever there's a change in the awareness states (e.g., a user joins or leaves).
        const states = Array.from(provider.awareness.getStates().values()) //Retrieves the updated awareness states of all connected users and converts them into an array.
        setUsers(states.filter(state => state.user && state.user.username).map(state => state.user))
      }) //Filters the updated awareness states to only include those with a valid user and username, then maps them to extract just the user information. Finally, it updates the users state with this filtered list of users.



//First setUsers(...) → gets the users who are already connected right now when the provider starts.

// Second setUsers(...) inside "change" → updates the list when something changes, like a new user joins or someone leaves.








      if (editorRef.current) {
        bindingRef.current = new MonacoBinding(
          yText,
          editorRef.current.getModel(),
          new Set([ editorRef.current ]),
          provider.awareness
        )
      }

      function handleBeforeUnload() {
        provider.awareness.setLocalStateField("user", null)
      } //When the user leaves/closes the page, it removes their user information from awareness.

      window.addEventListener("beforeunload", handleBeforeUnload) //Adds an event listener for the "beforeunload" event, which is triggered when the user is about to leave the page.


      return () => {
        if (bindingRef.current) {
          bindingRef.current.destroy()
          bindingRef.current = null
        }

        provider.awareness.setLocalStateField("user", null)
        provider.disconnect()

        providerRef.current = null

        window.removeEventListener("beforeunload", handleBeforeUnload)
      } //When the effect needs to be cleaned up, it:Disconnects the Socket.IO provider.Removes the browser event listener.This prevents old connections/listeners from remaining active.
    }
  }, [
    username //The effect will re-run whenever the username state changes. If the username is updated, the collaboration system will be re-initialized with the new username.
  ])

  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center" >
        <form
          onSubmit={handleJoin}
          className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-800 text-white"
            name="username"
          />
          <button
            className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold"
          >
            Join
          </button>
        </form>
      </main>
    )
  }

  return (
    <main
      className="h-screen w-full bg-gray-950 flex gap-4 p-4"
    >
      <aside
        className="h-full w-1/4 bg-amber-50 rounded-lg "
      >
        <h2 className="text-2xl font-bold p-4 border-b border-gray-300">Users</h2>
        <ul className="p-4">
          {users.map((user, index) => (
            <li key={index} className="p-2 bg-gray-800 text-white rounded mb-2">
              {user.username}
            </li>
          ))}
        </ul>

      </aside>
      <section
        className="w-3/4 bg-neutral-800 rounded-lg overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// some comment"
          theme="vs-dark"
          onMount={handleMount}
        />
      </section>

    </main>
  )
}

export default App