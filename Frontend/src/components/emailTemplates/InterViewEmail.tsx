import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "../../Database/FirebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore"; // Added updateDoc
import { DocumentData } from "firebase/firestore";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import "../exterNalcss/richTextEditor.css";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Swal from 'sweetalert2';
import { useTheme } from '../theme-provider';

interface TaskEmailProps {
  onSave: () => void;
}

export function InterViewEmail({ onSave }: TaskEmailProps) {
  const [subject, setSubject] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [Logo, setLogo] = useState<string>("");
  const [logoAlignment, setLogoAlignment] = useState<string>("");

  const { theme } = useTheme();

  const sweetAlertOptions: Record<string, unknown> = {
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff',
    color: theme === "dark" ? '#fff' : '#000',
    confirmButtonText: 'OK',
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9',
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545',
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchEmailTemplate = async () => {
    try {
      const templateDocRef = doc(
        db,
        "emailTemplate",
        "a037cbeb-d7d7-4917-aff4-1c18fa8a1c27",
        "InterviewTemplate",
        "b52444e0-a24b-4a63-a3b8-feb5d839b839"
      );
      const templateDoc = await getDoc(templateDocRef);

      if (templateDoc.exists()) {
        const data = templateDoc.data() as DocumentData;
        setSubject(data.Subject || "");
        setLogo(data.worqHatLogo || "");
        setLogoAlignment(data.logoAlignment || "");
        setSenderName(data.SenderName || "");
        const contentWithName = data.Content?.replace("{{Name}}", senderName) || `Hello <b>${senderName}</b>,\n\n`;
        setContent(contentWithName);
      } else {
        console.log("No document found!");
      }
    } catch (error) {
      console.error("Error fetching email template:", error);
    }
  };

  useEffect(() => {
    fetchEmailTemplate();
  }, [fetchEmailTemplate]);

  const saveEmailTemplate = async () => {
    try {
      const templateDocRef = doc(
        db,
        "emailTemplate",
        "a037cbeb-d7d7-4917-aff4-1c18fa8a1c27",
        "InterviewTemplate",
        "b52444e0-a24b-4a63-a3b8-feb5d839b839"
      );

      // Update the Firestore document with the new values
      await updateDoc(templateDocRef, {
        Subject: subject,
        Content: content,
        SenderName: senderName,
        worqHatLogo: Logo,
        logoAlignment: logoAlignment,
      });

      Swal.fire({
        ...sweetAlertOptions,
        icon: 'success',
        title: 'Template saved successfully',
        showConfirmButton: false,
        timer: 1500
      }).then(() => {
        onSave(); // Calling the onSave prop function to indicate completion
        window.location.reload(); // Reload the page to reflect the changes
      });
      
    } catch (error) {
      console.error("Error saving email template:", error);
      Swal.fire({
        ...sweetAlertOptions,
        icon: 'error',
        title: 'Failed to Save Template',
        text: 'There was an error updating the email template. Please try again later.',
        showConfirmButton: false,
        timer: 1500
      });
    }
  };

  return (
    <form className="space-y-3 m-auto pb-5">
      <div className="space-y-1">
        <label className="block font-semibold">Subject</label>
        <Input placeholder="Write the subject..." value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div className="space-y-1">
        <label className="block font-semibold">Content</label>
        <ReactQuill theme="snow" value={content} onChange={setContent} />
      </div>

      <div className="space-y-1">
        <label className="block font-semibold">Sender's Name</label>
        <ReactQuill theme="snow" value={senderName} onChange={setSenderName} />
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

      <Button type="button" variant="outline" onClick={saveEmailTemplate}>
        Send
      </Button>
      <br />
    </form>
  );
}