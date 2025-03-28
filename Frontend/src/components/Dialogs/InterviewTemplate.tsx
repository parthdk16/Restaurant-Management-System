import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InterViewEmail } from '../emailTemplates/InterViewEmail';
interface TaskEamilDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const InterviewDialog: React.FC<TaskEamilDialogProps> = ({ isOpen, onClose }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-3/4 max-w-screen-2xl h-auto max-h-[80vh] overflow-y-auto overflow-x-hidden p-4 scrollbar-hide">
                <div className="flex-1 space-y-3">
                    <DialogHeader>
                        <DialogTitle>Create Email</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <InterViewEmail onSave={onClose} />
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default InterviewDialog;