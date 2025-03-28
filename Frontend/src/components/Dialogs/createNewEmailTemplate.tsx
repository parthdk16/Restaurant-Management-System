import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {  Input } from '@/components/ui/input';
import {Button  } from '@/components/ui/button';
import {  ScrollArea  } from '@/components/ui/scroll-area';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Trash2 , Plus, ChevronDownIcon} from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import worQHatLogo from '@/assets/WorqHat TM Logo.png';
import { db } from "../../Database/FirebaseConfig";
import { collection, doc , getDocs, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';

interface NewEmailDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateNewEmailTemplate: React.FC<NewEmailDialogProps> = ({ isOpen, onClose }) => {
    const [EmailType, setEmailType ] = useState('');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [senderName, setSenderName] = useState('');
    const [fields, setFields] = useState([{ title: '', detail: '' }]);
    const [Logo] = useState<string>("");
    const [logoAlignment, setLogoAlignment] = useState<string>("");

    const handleFieldChange = (index: number, field: 'title' | 'detail', value: string): void => {
        const newFields = [...fields];
        newFields[index][field] = value;
        setFields(newFields);
    };

    const addField = () => {
        setFields([...fields, { title: '', detail: '' }]);
    };

    const removeField = (index: number) => {
        const newFields = fields.filter((_, i) => i !== index);
        setFields(newFields);
    };


    const handleSubmit = async () => {
        // Handle form submission
        const data = {
            EmailType,
            subject,
            content,
            senderName,
            fields,
            Logo,
            logoAlignment,
            isActive: true,
        };

        try {
            const collectionRef = collection(db, "emailTemplate", "12d5b028-1d9c-4964-9e4b-24b35b3ffeb4", "ShortlistedCandidatesTemplates");
            const docId = uuidv4(); 
            const docRef = doc(collectionRef, docId);
            await setDoc(docRef, data);

            const querySnapshot = await getDocs(collectionRef);
            querySnapshot.forEach(async (doc) => {
                if (doc.id !== docRef.id) {
                    await setDoc(doc.ref, { isActive: false }, { merge: true });
                }
            });

            alert("Template created successfully!");
            onClose();
        } catch (error) {
            console.error("Error creating template: ", error);
            alert("Failed to create template.");
        }
    };
    return (
        <Dialog  open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[725px]">
                <DialogHeader>
                    <DialogTitle>Create New Email Template</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[410px] p-4">
                    <div className="grid gap-4 py-4">
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="EmailType" className="text-left">Email Type</Label>
                            <Input id="EmailType" required value={EmailType} onChange={(e) => setEmailType(e.target.value)} placeholder="Subject" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="subject" className="text-left">Subject</Label>
                            <Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="content" className="text-left">Content</Label>
                            <ReactQuill theme="snow" className="col-span-3" value={content} onChange={setContent} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="senderName" className="text-left">Sender Name</Label>
                            <Input id="senderName" required value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Sender Name" className="col-span-3" />
                        </div>
                        <div className="rid grid-cols-4 items-center gap-4">
                            <div className="mt-2">
                            <label className="text-left">Logo Alignment:</label>
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
                                {Logo && <img src={worQHatLogo} alt="Logo" className="inline-block w-32 h-auto" />}
                            </div>
                        </div>
                        {fields.map((field, index) => (
                            <div key={index} className="grid grid-cols-4 items-center gap-4 mb-2">
                                <Input id={`title-${index}`} placeholder="Title" value={field.title} onChange={(e) => handleFieldChange(index, "title", e.target.value)} className="col-span-1 text-base" />
                                <div className="col-span-3 flex items-center gap-4">
                                    <ReactQuill theme="snow" className="flex-1" value={field.detail} onChange={(value) => handleFieldChange(index, 'detail', value)} />
                                    <Trash2 className="text-red-500 cursor-pointer" onClick={() => removeField(index)} />
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" onClick={addField} className="border-2">
                            Add Field <Plus className="ml-2 size-5" />
                        </Button>
                    </div>
                </ScrollArea>
                <DialogClose>
                    <Button type="submit" variant="outline" onClick={handleSubmit} className="mr-4">Create Template</Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    );
};

export default CreateNewEmailTemplate;

