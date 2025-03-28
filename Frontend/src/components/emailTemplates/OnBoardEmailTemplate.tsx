import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "../../Database/FirebaseConfig";
import { doc, getDoc} from "firebase/firestore";
import { DocumentData } from "firebase/firestore";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import "../exterNalcss/richTextEditor.css"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
// import { HtmlEditor, Image, Inject, Link, QuickToolbar, RichTextEditorComponent, Toolbar  , ChangeEventArgs } from '@syncfusion/ej2-react-richtexteditor';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { handleDeleteMultiple, handleUpload } from "../../Database/OnBoardDocumentUploads";
import {Trash2 } from "lucide-react";
import Swal from 'sweetalert2';
import axios from 'axios';
import { useTheme } from '../theme-provider';
import { API_URL } from "@/constants";
import {Sparkles} from "lucide-react"

interface OnBoardFormProps {   
  name: string;
  candidateMail: string;
  jobTitle: string;
  onSave: () => void;
}

export function OnBoardForm({ name, candidateMail, jobTitle, onSave }: OnBoardFormProps) {

  // const toolbarSettings: object = {
  //   items: ['Bold', 'Italic', 'Underline', 'StrikeThrough',
  //   'LowerCase', 'UpperCase', '|',
  //   'Alignments', 'UnorderedList' , 'OrderedList',
  //   'Outdent', 'Indent',  '|', 'Image' , 'Link' , '|' , 'Undo', 'Redo']
  // }

  // const [subject, setSubject] = useState<string>("");
  const [content, setContent] = useState<string>(`Hello ${name},\n\n`);
  const [senderName, setSenderName] = useState<string>(""); 
  const [subject, setSubject] = useState<string>(`Selected for ${jobTitle}`);
  const [Logo, setLogo] = useState<string>("");
  const [logoAlignment, setLogoAlignment] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; loading: boolean }[]>([]);


  const { theme } = useTheme();

  const sweetAlertOptions = {
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff', 
    color: theme === "dark" ? '#fff' : '#000', 
    confirmButtonText: 'OK', 
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9', 
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545', 
  };

  const handleAISuggestionClick = () => {
    if (!name || !subject || !jobTitle) {
      return;
    }
  
    console.log("Sending to backend:", { name, subject, jobTitle });
  
    fetch(`${API_URL}/api/generate-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        subject,
        jobTitle,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.text();
          console.error(`API Error (${response.status}):`, error);
          throw new Error(error);
        }
        return response.json();
      })
      .then((result) => {
        console.log("Full Response from Backend:", result);
  
        // Set the AI-generated content in the editor
        if (result.content) {
          setContent(result.content);
        } else {
          console.error("No content received from the AI response.");
        }
      })
      .catch((error) => console.error("Error fetching AI suggestion:", error));
  };
  
    // Load uploaded files from local storage on mount
    useEffect(() => {
      const storedFiles = localStorage.getItem("uploadedFiles");
      if (storedFiles) {
        setUploadedFiles(JSON.parse(storedFiles));
      }
    }, []);
  
    // Save uploaded files to local storage when state changes
    useEffect(() => {
      localStorage.setItem("uploadedFiles", JSON.stringify(uploadedFiles));
    }, [uploadedFiles]);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    const files = e.target.files;
    if (!files) return;
  
    Array.from(files).forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          ...sweetAlertOptions,
          icon: 'error',
          title: 'Invalid file type',
          text: `Invalid file type: ${file.name}. Only PDFs are allowed.`,
        });
        return;
      }
  
      const fileName = file.name;
      const newFile = { name: fileName, url: "", loading: true, progress: 0 };

      setUploadedFiles((prev) => [...prev, newFile]);

      handleUpload(file, (url: string) => {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.name === fileName
              ? { ...f, url, loading: false, progress: 100 }
              : f
          )
        );
      });
    });
  };

  


  const fetchEmailTemplate = async () => {
    try {
      const templateDocRef = doc(  
       db,  
      "emailTemplate",
      "qSkVrVt2y7t1O1Ckq7AK",
      "OnboardingEmail",
      "mutGZpldFuOXkMIH5UhM"
    );
      const templateDoc = await getDoc(templateDocRef);

      if (templateDoc.exists()) {
        const data = templateDoc.data() as DocumentData;
        setSubject(`Selected for ${jobTitle}`);
        setLogo(data.worqHatLogo || "");
        setLogoAlignment(data.logoAlignment || "");
        setSenderName(data.SenderName || "");
        const contentWithName = data.Content?.replace("{{Name}}", name) || `Hello <b>${name}</b>,\n\n`;
        // console.log(name);
        setContent(contentWithName);
        if (data.AttachedFiles) {
            setUploadedFiles(data.AttachedFiles);
          }

        // const parsedSenderName = data.SenderName ? JSON.parse(data.SenderName) : "";
        // setSenderName(parsedSenderName);
        // console.log(data);
        // console.log(name);
      } else {
        console.log("No document found!");
      }
    } catch (error) {
      console.error("Error fetching email template:", error);
    }
  };

  useEffect(() => {
    fetchEmailTemplate();
  }, []);

  const handleDeleteFile = async (fileUrl: string) => {
    const updatedFiles = uploadedFiles.filter((file) => file.url !== fileUrl);
    setUploadedFiles(updatedFiles);

    // const emailTemplateRef = doc(db, "OnBoardEmailTemplate", "Ezkpk1y0oGVVKvuU34fV");
    // await updateDoc(emailTemplateRef, {
    //   AttachedFiles: updatedFiles
    // });

    Swal.fire({
      ...sweetAlertOptions,
      icon: 'success',
      title: 'File Deleted',
      text: 'File deleted successfully.',
      showConfirmButton: false,
      timer: 1500
    });
}

  const saveEmailTemplate = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/send-onboard-bulk-email`, {
        emails: [candidateMail],
        subject,
        content,
        senderName,
        Logo,
        logoAlignment,
        uploadedFiles,
      });
      
      if (response.status === 200) {
         handleDeleteMultiple(uploadedFiles.map(file => file.url));
               // console.log(uploadedFiles);
                setUploadedFiles([]);
                localStorage.removeItem("uploadedFiles");
       Swal.fire({
        ...sweetAlertOptions,
               icon: 'success',
               title: 'Template saved successfully',
               showConfirmButton: false,
               timer: 1500
             }).then(() => {
               onSave();
               window.location.reload();
              });
                // uploadedFiles.forEach((file) => handleDeleteFile(file.url));
                // for (const file of uploadedFiles) {
                //   await handleDeleteFile(file.url);
                // }
               
        // console.log(candidateMail);
      } else {
      Swal.fire({
        ...sweetAlertOptions,
        icon: 'error',
        title: 'Failed to Send Emails',
        text: 'There was an error sending the emails. Please try again later.',
        showConfirmButton: false,
        timer: 1500
      });
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      Swal.fire({
        ...sweetAlertOptions,
        icon: 'error',
        title: 'Failed to Send Emails',
        text: 'There was an error sending the emails. Please try again later.',
        showConfirmButton: false,
        timer: 1500
      });
    }
  };

  // const contentFieldChanged2 = (data) => {
  //   setSenderName(data); 
  // };

  // const contentFieldChanged1 = (data) => {
  //   setContent(data); 
  // };


  // const onSenderNameChange = (args: ChangeEventArgs) => {
  //   setSenderName(args.value); // Set the sender name
  // };

  // const onContentChange = (args: ChangeEventArgs) => {
  //   setContent(args.value); // Set the sender name
  // };

  return (
    <form className="space-y-3  m-auto pb-5">
      <div className="space-y-1">
        <label className="block font-semibold">Subject</label>
        <Input placeholder="Write the subject..." value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div className="space-y-1">
      <label className="block font-semibold">Content</label>
      <span 
      className="flex items-center text-blue-600 font-semibold cursor-pointer hover:text-blue-800 transition-all duration-200"
      onClick={handleAISuggestionClick}
    >
      <span className="mr-2">AI Suggestion</span>
      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
      </span>
      <ReactQuill theme="snow" value={content} onChange={setContent}/>
      {/* <RichTextEditorComponent value={content} change={onContentChange}>
        <Inject services={[Toolbar, Image, Link, HtmlEditor, QuickToolbar]} />
      </RichTextEditorComponent> */}
    </div>

      <div className="space-y-1">
        <label className="block font-semibold">Sender's Name</label>
        <ReactQuill theme="snow" value={senderName} onChange={setSenderName}/>
       {/* <RichTextEditorComponent
        value={senderName}
        change={onSenderNameChange}
      >
      <Inject services={[Toolbar, Image, Link, HtmlEditor, QuickToolbar]} />
     </RichTextEditorComponent> */}
      </div>

      <div className="space-y-1">
        <div className="mt-2">
          <label className="font-semibold">Logo Alignment:</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-2 p-1 border rounded" variant="outline">
                {logoAlignment.charAt(0).toUpperCase() + logoAlignment.slice(1)} <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setLogoAlignment("left")}>Left</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLogoAlignment("center")}>Center</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLogoAlignment("right")}>Right</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className={`mt-4 ${logoAlignment === "left" ? "text-left" : logoAlignment === "center" ? "text-center" : "text-right"}`}>
          {Logo && <img src={Logo} alt="Logo" className="inline-block w-32 h-auto" />}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block font-semibold">
          Attachments</label>
          <Input
          type="file"
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          multiple
          onChange={handleFileSelection}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />
        <div className="mt-2 space-y-4">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="border p-2 rounded shadow">
              <div className="flex justify-between items-center">
                <div className="font-semibold text-sm">
                  {file.loading ? (
                    <div className="flex items-center">
                      <div
                        className="w-5 h-5 border-2 border-t-transparent border-gray-500 rounded-full animate-spin"
                        // style={{ borderWidth: "2px" }}
                      ></div>
                      <span className="ml-2">Uploading...</span>
                    </div>
                  ) : (
                    <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {file.name}
                  </a>
                  )}
                </div>
                {!file.loading && (
                  <Trash2 className="text-red-500 cursor-pointer" onClick={() => handleDeleteFile(file.url)} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button type="button" variant="outline" onClick={saveEmailTemplate}>
        Send
      </Button>
      <br />
    </form>
  );
}
