import { FC, useEffect, useState, useCallback } from "react";
import {  useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loader1 from "./Loader";
import { auth, db } from "../Database/FirebaseConfig";
import { Sidebar } from "./Sidebar";
import { Label } from "@radix-ui/react-label";
import { collection, setDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import { TableCard } from "./TableCard";
import 'react-quill/dist/quill.snow.css';
import {Header} from "./Header";
import Swal from 'sweetalert2';
import {v4 as uuidv4} from 'uuid';
import 'rsuite/DatePicker/styles/index.css';
import './exterNalcss/date.css'
import { useTheme } from './theme-provider';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface Table {
  tableId: string;
  tableNo: number;
  title: string;
  createdBy: string;
  createdAt: Date;
}

export const ManageTables: FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const { theme } = useTheme();

  const sweetAlertOptions: Record<string, unknown> = {
    background: theme === "dark" ? 'rgba(0, 0, 0, 0.9)' : '#fff', 
    color: theme === "dark" ? '#fff' : '#000', 
    confirmButtonText: 'OK', 
    confirmButtonColor: theme === "dark" ? '#3085d6' : '#0069d9', 
    cancelButtonColor: theme === "dark" ? '#d33' : '#dc3545', 
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        });
      } else {
        setUser(null);
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const addTable = async () => {

    const tId = uuidv4();

    const tablesSnapshot = await getDocs(collection(db, "Tables"));
    const count = tablesSnapshot.size + 1;

    try {
      const tableData = {
        tableId: tId,
        tableNo: count,
        createdBy: user?.email,
        createdAt: new Date(),
      };
      console.log(tableData);

      const tableRef = doc(db, "Tables", tId);
      await setDoc(tableRef, tableData);

      Swal.fire({
        ...sweetAlertOptions,
        title: "Success!",
        text: "New table added successfully!",
        icon: "success"
      });
      fetchTables();
    } catch (error) {
      console.error("Error creating Table: ", error);
      Swal.fire({
        ...sweetAlertOptions,
        title: "Error!",
        text: "Something went wrong. Please try again!",
        icon: "error"
      });
    }
  };

  const fetchTables = useCallback(async () => {
    try {
      const tablesCollection = collection(db, "Tables");
      const tableSnapshot = await getDocs(tablesCollection);
      const tableList = tableSnapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as Table[];
      setTables(tableList);
    } catch (error) {
      console.error("Error fetching tables: ", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (tableId: string): Promise<void> => {
    Swal.fire({
      ...sweetAlertOptions,
      title: "Are you sure you want to delete this table?",
      showDenyButton: true,
      confirmButtonText: "Yes, delete table",
      denyButtonText: `No, don't delete`,
    }).then(async (result) => {
      if (result.isDenied) {
        return;
      } else if (result.isConfirmed) {
        try {
          const tableDoc = doc(db, "Tables", tableId);
          await deleteDoc(tableDoc);
          Swal.fire({
            ...sweetAlertOptions,
            title: "Success!",
            text: "table deleted successfully!",
            icon: "success"
          });
          fetchTables();
        } catch (error) {
          console.error("Error deleting table: ", error);
        }
      }
    });
  };

  useEffect(() => {
    fetchTables();

    const interval = setInterval(fetchTables, 600000);

    return () => clearInterval(interval); 
  }, [fetchTables]);

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[230px_1fr]">
      <Sidebar user={user} activePage="tables" />
      <div className="flex flex-col h-screen">
        <Header/>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-y-auto scrollbar-hide">
          <div className="flex items-center">
            <h1 className="text-2xl text-primary font-bold">Tables</h1>
          </div>
            <div className="flex flex-row gap-4 items-center">
              <div className="w-1/2 grid grid-col gap-y-2">
                <Label className="text-left font-semibold">Search</Label>
                <Input
                  type="text"
                  placeholder="Search Tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="justify-end">
                <Button onClick={addTable}>
                  Add new table <Plus/>
                </Button>
              </div>
            </div>
            <div className="w-full flex flex-wrap place-self-center relative justify-center">
              {loading ? (
                <div className="absolute items-center justify-center bg-opacity-50 z-10">
                  <Loader1 />
                </div>
              ) : tables.length === 0 ? (
                <p className="text-lg font-semibold text-gray-700 mt-0 text-left">
                          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            "Your next great service is just a table away!"
                          </span>
                        </p>
              ) : (
                <div className="justify-center grid gap-x-16 gap-y-4 grid-cols-2 md:grid-cols-3 md:gap-y-4 md:gap-x-16 lg:grid-cols-3 lg:gap-x-24 lg:gap-y-3">
                  {tables.map((table) => (
                    <TableCard
                      id={table.tableId}
                      tableNo={table.tableNo}
                      title={"Table "+table.tableNo}
                      createdBy={table.createdBy}
                      createdAt={new Date(table.createdAt).toLocaleDateString()}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
        </main>
      </div>
    </div>
  );
};