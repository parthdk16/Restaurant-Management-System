import React , {useState} from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import EmailDialog from '../emailTemplates/emailDialog';
import CreateNewEmailTemplate from './createNewEmailTemplate';
import  EmailTemplateCards  from './EmailTempLateCards';

interface typesOfEmailProps {
    isOpen: boolean;
    onClose: () => void; 
}



const TypesOfTemplates:React.FC<typesOfEmailProps> = ({ isOpen, onClose }) => {

    const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
    const [isNewEmailDialogOpen, setIsNewEmailDialogOpen] = useState(false);
    const [isEmailTemplateCardsDialogOpen, setIsEmailTemplateCardsDialogOpen] = useState(false);

    const openEmailDialog = () => {
        setIsEmailDialogOpen(true);
    };
    
    const closeEmailDialog = () => {
        setIsEmailDialogOpen(false);
    };

    const openNewEmailDialog = () => {
        setIsNewEmailDialogOpen(true);
    };
    
    const closeNewEmailDialog = () => {
        setIsNewEmailDialogOpen(false);
    };

    const openEmailTemplateCardsDialog = () => {
        setIsEmailTemplateCardsDialogOpen(true);
    };
    
    const closeEmailTemplateCardsDialog = () => {
        setIsEmailTemplateCardsDialogOpen(false);
    };

    return (
        <div>
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-3/4 max-w-screen-2xl h-auto max-h-[80vh] overflow-y-auto overflow-x-hidden p-4 scrollbar-hide">
                <div className="flex-1 space-y-3">
                    <DialogHeader>
                        <DialogTitle>Create Email</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <div className="flex space-x-4">
                        <div className="flex-1 p-4 border rounded shadow">
                            <h2 className="text-lg font-semibold mb-2">Create New Email Template</h2>
                            <p className="mb-4">Start from scratch and create a new email template.</p>
                            <Button variant="outline" onClick={openNewEmailDialog}>Create New Template</Button>
                        </div>
                        <div className="flex-1 p-4 border rounded shadow">
                            <h2 className="text-lg font-semibold mb-2">Use default Email Template</h2>
                            <p className="mb-4">Quickly use the default email template you used.</p>
                            <Button  variant="outline" onClick={openEmailDialog}>Use Default Template</Button>
                        </div>
                        <div className="flex-1 p-4 border rounded shadow">
                            <h2 className="text-lg font-semibold mb-2">View All Templates</h2>
                            <p className="mb-4">Browse through all the email templates you have created.</p>
                            <Button variant="outline" onClick={openEmailTemplateCardsDialog}>View Templates</Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
         <EmailDialog isOpen={isEmailDialogOpen} onClose={closeEmailDialog} />
        <CreateNewEmailTemplate isOpen={isNewEmailDialogOpen} onClose={closeNewEmailDialog} />
        <EmailTemplateCards isOpen={isEmailTemplateCardsDialogOpen} onClose={closeEmailTemplateCardsDialog} />
         </div>
    );
};

export default TypesOfTemplates;