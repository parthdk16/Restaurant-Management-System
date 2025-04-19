import { FC, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  getAdminSecuritySettings, 
  updateSecretCode, 
  addAdminEmail, 
  removeAdminEmail 
} from '../Database/AdminSecurityService';
import { auth } from '../Database/FirebaseConfig';
import { X, Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AdminSecuritySettings {
  adminEmails: string[];
  secretCode: string;
  lastUpdated: Date;
  updatedBy: string;
}

export const SecuritySettings: FC = () => {
  const [settings, setSettings] = useState<AdminSecuritySettings | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newSecretCode, setNewSecretCode] = useState('');
  const [confirmSecretCode, setConfirmSecretCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settingsData = await getAdminSecuritySettings();
      setSettings(settingsData);
    } catch (err) {
      console.error("Error loading settings:", err);
      setError("Failed to load security settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
      document.title = 'Security - Hotel Shripad';
    }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!newEmail || !newEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (settings?.adminEmails.includes(newEmail.toLowerCase())) {
      setError('This email is already in the admin list');
      return;
    }
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        setError('You must be logged in to make changes');
        return;
      }
      
      await addAdminEmail(newEmail, currentUser.email);
      setSuccess(`Added ${newEmail} to admin list`);
      setNewEmail('');
      loadSettings();
    } catch (err) {
      console.error("Error adding admin:", err);
      setError("Failed to add admin");
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    setError('');
    setSuccess('');
    
    // Don't allow removing the last admin
    if (settings?.adminEmails.length === 1) {
      setError('Cannot remove the last admin');
      return;
    }
    
    // Don't allow removing yourself
    if (email === auth.currentUser?.email) {
      setError('You cannot remove your own admin access');
      return;
    }
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        setError('You must be logged in to make changes');
        return;
      }
      
      await removeAdminEmail(email, currentUser.email);
      setSuccess(`Removed ${email} from admin list`);
      loadSettings();
    } catch (err) {
      console.error("Error removing admin:", err);
      setError("Failed to remove admin");
    }
  };

  const handleUpdateSecretCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!newSecretCode) {
      setError('Secret code cannot be empty');
      return;
    }
    
    if (newSecretCode !== confirmSecretCode) {
      setError('Secret codes do not match');
      return;
    }
    
    if (!confirmUpdate) {
      setConfirmUpdate(true);
      return;
    }
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        setError('You must be logged in to make changes');
        return;
      }
      
      await updateSecretCode(newSecretCode, currentUser.email);
      setSuccess('Secret code updated successfully');
      setNewSecretCode('');
      setConfirmSecretCode('');
      setConfirmUpdate(false);
      loadSettings();
    } catch (err) {
      console.error("Error updating secret code:", err);
      setError("Failed to update secret code");
    }
  };

  const handleCancelUpdate = () => {
    setConfirmUpdate(false);
    setNewSecretCode('');
    setConfirmSecretCode('');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading security settings...</div>;
  }

  return (
    <div className=" p-12 m-12 container mx-auto py-10">
      <div className="flex items-center mb-8">
        <Shield className="h-6 w-6 mr-2" />
        <h1 className="text-3xl font-bold">Admin Security Settings</h1>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6 flex items-center">
          <AlertTriangle size={20} className="mr-2" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-6">
          {success}
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Admin Emails Section */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Access Control</CardTitle>
            <CardDescription>
              Manage who has admin access to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Current Admins</Label>
                <div className="mt-2 space-y-2">
                  {settings?.adminEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between bg-muted p-2 rounded-md">
                      <span>{email}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveAdmin(email)}
                        disabled={email === auth.currentUser?.email || settings.adminEmails.length <= 1}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
                {/* {settings?.lastUpdated && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last updated {formatDistanceToNow(new Date(settings?.lastUpdated), { addSuffix: true })} 
                    by {settings?.updatedBy}
                  </p>
                )} */}
                {settings?.lastUpdated && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last updated {
                      (() => {
                        try {
                          const date = new Date(settings.lastUpdated);
                          // Check if date is valid before formatting
                          return !isNaN(date.getTime()) 
                            ? formatDistanceToNow(date, { addSuffix: true })
                            : "recently";
                        } catch (e) {
                          return "recently";
                        }
                      })()
                    } by {settings?.updatedBy}
                  </p>
                )}
              </div>
              
              <Separator />
              
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="newEmail">Add New Admin</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="newEmail"
                      placeholder="admin@hotelshripad.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                    <Button type="submit">Add</Button>
                  </div>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
        
        {/* Secret Code Section */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Secret Code</CardTitle>
            <CardDescription>
              Update the secret code required for admin login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Current Secret Code</Label>
                <div className="relative">
                  <Input
                    value={settings?.secretCode || ''}
                    readOnly
                    type={isSecretVisible ? "text" : "password"}
                    className="pr-10 mt-1"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSecretVisible(!isSecretVisible)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 top-1"
                  >
                    {isSecretVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {settings?.lastUpdated && (
                    <p className="text-xs text-muted-foreground mt-2">
                        Last updated {
                        (() => {
                            try {
                            const date = new Date(settings.lastUpdated);
                            // Check if date is valid before formatting
                            return !isNaN(date.getTime()) 
                                ? formatDistanceToNow(date, { addSuffix: true })
                                : "recently";
                            } catch (e) {
                            return "recently";
                            }
                        })()
                        } by {settings?.updatedBy}
                    </p>
                    )}
              </div>
              
              <Separator />
              
              <form onSubmit={handleUpdateSecretCode} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="newSecretCode">New Secret Code</Label>
                  <Input
                    id="newSecretCode"
                    type="password"
                    placeholder="Enter new secret code"
                    value={newSecretCode}
                    onChange={(e) => setNewSecretCode(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="confirmSecretCode">Confirm Secret Code</Label>
                  <Input
                    id="confirmSecretCode"
                    type="password"
                    placeholder="Confirm new secret code"
                    value={confirmSecretCode}
                    onChange={(e) => setConfirmSecretCode(e.target.value)}
                  />
                </div>
                
                {confirmUpdate ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                    <p className="font-semibold">Warning!</p>
                    <p className="text-sm">
                      Changing the secret code will require all admins to use the new code when logging in.
                      Are you sure you want to continue?
                    </p>
                    <div className="flex space-x-2 mt-3">
                      <Button type="submit" variant="destructive">Yes, Update Code</Button>
                      <Button type="button" variant="outline" onClick={handleCancelUpdate}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button type="submit" className="w-full">Update Secret Code</Button>
                )}
              </form>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start">
            <p className="text-sm text-muted-foreground">
              The secret code is required for all admin logins, including Google sign-in.
              Make sure to share this code only with authorized personnel.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};