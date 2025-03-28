import { FC, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "../Database/FirebaseConfig";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@radix-ui/react-label";
import { setDoc, doc, collection, getDocs, query, where, updateDoc } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";
import 'react-quill/dist/quill.snow.css';
import Swal from 'sweetalert2';
import { useTheme } from "./theme-provider";
// import Loader1 from "./Loader";

interface Candidate {
    id: string;
    uid: string;
    name:string;
    firstName:string;
    lastName:string;
    emailId: string;
    phone: string;
    jobTitle: string;
    status: "profile shortlisted" | "rejected" | "CantDecide" | "";
    resumeUrl: string;
    linkedin:  string;
    twitter: string;
    gitHub: string;
    portfolioUrl: string;
    achievements: string;
    education:  string;
    experience: string;
    skillset: string;
    department: string;
    location:string;
    highestEdu: string;
    yearsOfExp: string;
    relocate: string;
  };

interface EditPostProps {
    id: string;
    title: string;
    createdBy: string | null | undefined;
    createdAt: string;
}

export const EditOrder: FC<EditPostProps> = ({
    id,
    title,
    createdBy,
}) => {
    const [oldJobTitle, setOldJobTitle] = useState(title);
    const [jobTitle, setJobTitle] = useState(title);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { theme } = useTheme();
    
      const sweetAlertOptions: Record<string, unknown> = {
        background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff', 
        color: theme === "dark" ? '#fff' : '#000', 
        confirmButtonText: 'OK', 
        confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9', 
        cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545', 
      };

    const handleUpdate = async () => {
        try {
            const postData = {
                jobTitle,
                createdBy: createdBy,
                createdAt: new Date(),
            };
            console.log(postData);
            const postDoc = doc(db, "Posts", id);
            await setDoc(postDoc, postData, { merge: true });
            Swal.fire({
                ...sweetAlertOptions,
                title: "Success!",
                text: "Post updated successfully!",
                icon: "success"
            });
            updateCandidatesWithNewJobDetails(jobTitle);
            // fetchPosts();
            window.location.reload();
        } catch (error) {
            console.error("Error updating post: ", error);
        }
    };

    const fetchCandidates = async () => {
        try {
            const candidatesCollection = collection(db, "CandidateInfo");
            const q = query(candidatesCollection, where("jobTitle", "==", oldJobTitle));
            const candidatesSnapshot = await getDocs(q);
            const candidateList = candidatesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Candidate[];
            setCandidates(candidateList);
            return candidateList;
        } catch (error) {
            console.error("Error fetching candidates: ", error);
        } finally {
            setLoading(false);
        }
    };

    // useEffect(() => {
    //     fetchCandidates();
    // }, []);

    async function updateCandidatesWithNewJobDetails(newJobTitle: string) {
        try {
          const candidates = await fetchCandidates();

          if(!candidates)
            return null;
      
          if (candidates.length === 0) {
            console.log("No candidates found for this post.");
            return;
          }
      
          const updatePromises = candidates.map(async (candidate) => {
            const candidateRef = doc(db, "CandidateInfo", candidate.uid);
            console.log(candidateRef);
            await updateDoc(candidateRef, {
              jobTitle: newJobTitle,
            });
          });
      
          await Promise.all(updatePromises);
      
          console.log("Candidates updated successfully!");
        } catch (error) {
          console.error("Error updating candidates:", error);
        }
      }
      

    return (
        <div className="">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>

                <DialogTrigger asChild>
           
              <Button className="mt-4 py-2 px-4 rounded" variant="outline"> 
                    <Pencil className="cursor-pointer mr-2" onClick={(e) => {
                        e.stopPropagation();
                        setIsDialogOpen(true);
                     }} />
                    Add orders
              </Button>
              
                </DialogTrigger>
                <DialogContent className="sm:max-w-[725px]">
                    <DialogHeader>
                        <DialogTitle>Update Post</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[410px] p-4">
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="jtitle" className="text-left">Job Title</Label>
                                <Input id="jtitle" required value={jobTitle} onChange={(e) => {setJobTitle(e.target.value); setOldJobTitle(e.target.value);}} placeholder="Job Title" className="col-span-3" />
                            </div>
                            <Button variant="outline" className="border-2">
                                Add Field <Plus className="ml-2 size-5" />
                            </Button>
                        </div>
                    </ScrollArea>
                    <DialogClose asChild>
                        <Button type="submit" onClick={handleUpdate} className="mr-4">Update Post</Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>

            {/* {loading && <Loader1/>} */}
        </div>
    );
};