import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { collection, getDocs } from 'firebase/firestore';
import { db } from "../../Database/FirebaseConfig";
import EditEmailTemplate from './EditEmailTemplate';  // Import your EditEmailTemplate component

interface EmailTemplateCardsProps {
    isOpen: boolean;
    onClose: () => void;
}

const EmailTemplateCards: React.FC<EmailTemplateCardsProps> = ({ isOpen, onClose }) => {
    interface EmailTemplate {
        id: string;
        EmailType: string;
    }

    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);

    const fetchEmailTemplates = async () => {
        const emailTemplatesCollection = collection(db, 'emailTemplate', '12d5b028-1d9c-4964-9e4b-24b35b3ffeb4', 'ShortlistedCandidatesTemplates');
        const emailTemplatesSnapshot = await getDocs(emailTemplatesCollection);
        const emailTemplatesList = emailTemplatesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id, 
                EmailType: data.EmailType,
            } as EmailTemplate;
        });
        setEmailTemplates(emailTemplatesList);
    };

    useEffect(() => {
        fetchEmailTemplates();
    }, []);

    const handleUseTemplate = (templateId: string) => {
        setSelectedTemplateId(templateId);
        setEditDialogOpen(true); // Open the edit dialog
    }

    return (
        <div>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="flex w-3/4 max-w-screen-2xl h-auto max-h-[80vh] overflow-y-auto overflow-x-hidden p-4 scrollbar-hide">
                    <div className="flex-1 space-y-3">
                        <DialogHeader>
                            <DialogTitle>Select Email Template</DialogTitle>
                        </DialogHeader>
                        <hr />
                        <div className="flex space-x-4">
                            <div className="flex flex-wrap mt-4">
                                {emailTemplates.map((template) => (
                                    <div key={template.id} className="flex-1 p-4 border rounded shadow m-2">
                                        <h2 className="text-lg font-semibold mb-2">{template.EmailType}</h2>
                                        <Button variant="outline" onClick={() => handleUseTemplate(template.id)}>Use Template</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={onClose}>Close</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
            
            <EditEmailTemplate 
                isOpen={isEditDialogOpen} 
                onClose={() => setEditDialogOpen(false)} 
                templateId={selectedTemplateId}
            />
        </div>
    );
};

export default EmailTemplateCards;