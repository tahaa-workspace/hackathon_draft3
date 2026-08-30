import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function UploadDocument({ onUploadSuccess }) {

    const { token, user } = useAuth();

    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("Personal");
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);


    const handleUpload = async (e) => {

        e.preventDefault();


        if (!file) {
            setMessage("Please select a file.");
            return;
        }


        if (!token) {
            setMessage("You must be logged in to upload a document.");
            return;
        }


        try {

            setUploading(true);
            setMessage("");


            const formData = new FormData();

            formData.append("title", title);
            formData.append("category", category);
            formData.append("file", file);


            const response = await fetch("/api/documents", {

                method: "POST",

                headers: {
                    Authorization: `Bearer ${token}`,
                },

                body: formData,

            });


            const data = await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message || "Upload failed."
                );

            }


            setMessage(
                "Document uploaded successfully!"
            );


            setTitle("");
            setCategory("Personal");
            setFile(null);


            // Refresh document list in Owner Dashboard
            if (onUploadSuccess) {
                onUploadSuccess();
            }


            console.log(
                "Uploaded document:",
                data.document
            );


        } catch (error) {

            setMessage(error.message);

        } finally {

            setUploading(false);

        }

    };


    return (

        <div>

            <h2>Upload Document</h2>


            {user && (

                <p>

                    Logged in as:{" "}

                    {user.username || user.email}

                </p>

            )}


            <form onSubmit={handleUpload}>


                <div>

                    <label>
                        Document Title
                    </label>


                    <input
                        type="text"
                        placeholder="Example: Property Agreement"
                        value={title}
                        onChange={(e) =>
                            setTitle(e.target.value)
                        }
                        required
                    />

                </div>


                <div>

                    <label>
                        Category
                    </label>


                    <select
                        value={category}
                        onChange={(e) =>
                            setCategory(e.target.value)
                        }
                    >

                        <option value="Personal">
                            Personal
                        </option>

                        <option value="Financial">
                            Financial
                        </option>

                        <option value="Legal">
                            Legal
                        </option>

                        <option value="Insurance">
                            Insurance
                        </option>

                        <option value="Property">
                            Property
                        </option>

                        <option value="Family">
                            Family
                        </option>

                        <option value="Other">
                            Other
                        </option>

                    </select>

                </div>


                <div>

                    <label>
                        Select Document
                    </label>


                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                            setFile(e.target.files[0])
                        }
                        required
                    />

                </div>


                <button
                    type="submit"
                    disabled={uploading}
                >

                    {uploading
                        ? "Uploading..."
                        : "Upload Document"}

                </button>


            </form>


            {message && (
                <p>{message}</p>
            )}

        </div>

    );

}