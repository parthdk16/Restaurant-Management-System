import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "../../Database/FirebaseConfig";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { DocumentData } from "firebase/firestore";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import "../exterNalcss/richTextEditor.css"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import Swal from 'sweetalert2';
import  ReactQuill  from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTheme } from '../theme-provider';

interface SimpleFormProps {
  onSave: () => void;
}

export function SimpleForm({ onSave }: SimpleFormProps) {

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

  const fetchEmailTemplate = async () => {
    try {
      const templateDocRef = doc(db,    
        "emailTemplate",
        "12d5b028-1d9c-4964-9e4b-24b35b3ffeb4",
        "ShortlistedCandidatesTemplates",
        "1cff5593-7054-4120-a911-1bc883f25e18");
      const templateDoc = await getDoc(templateDocRef);

      if (templateDoc.exists()) {
        const data = templateDoc.data() as DocumentData;
        setSubject(data.Subject || "");
        setLogo(data.worqHatLogo || "");
        setLogoAlignment(data.logoAlignment || "");
        setSenderName(data.SenderName || "");
        setContent(data.Content || "");
        
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

  const saveEmailTemplate = async () => {
    try {
      const emailTemplateRef = doc(db,   
        "emailTemplate",
        "12d5b028-1d9c-4964-9e4b-24b35b3ffeb4",
        "ShortlistedCandidatesTemplates",
        "1cff5593-7054-4120-a911-1bc883f25e18"
      );
      // Set the current template as active
      await setDoc(emailTemplateRef, {
        Subject: subject,
        Content: content,
        SenderName: senderName,
        worqHatLogo: Logo,
        logoAlignment: logoAlignment,
        isActive: true,
      });

      // Deactivate other templates
      const templatesSnapshot = await getDocs(collection(db, "emailTemplate", "12d5b028-1d9c-4964-9e4b-24b35b3ffeb4", "ShortlistedCandidatesTemplates"));
      templatesSnapshot.forEach(async (doc) => {
        if (doc.id !== "1cff5593-7054-4120-a911-1bc883f25e18") {
          await setDoc(doc.ref, { isActive: false }, { merge: true });
        }
      });
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
    } catch (error) {
      console.error("Error saving email template:", error);
      Swal.fire({
        ...sweetAlertOptions,
        icon: 'error',
        title: 'Error',
        text: 'Error saving email template',
      });
    }
  };

  return (
    <form className="space-y-3  m-auto pb-5">
      <div className="space-y-1">
        <label className="block font-semibold">Subject</label>
        <Input placeholder="Write the subject..." value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div className="space-y-1">
      <label className="block font-semibold">Content</label>
      <ReactQuill theme="snow" value={content} onChange={setContent}/>
    </div>

      <div className="space-y-1">
        <label className="block font-semibold">Sender's Name</label>
        <ReactQuill theme="snow" value={senderName} onChange={setSenderName}/>
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
        Save Template
      </Button>
    </form>
  );
}
