import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Mail, Clock, Crown, Shield, User } from "lucide-react";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'owner' | 'admin' | 'user';
  createdAt: string;
}

interface TeamInvite {
  _id: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
  invitedBy: {
    firstName: string;
    lastName: string;
  };
}

export default function TeamManagement() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [inviteToCancel, setInviteToCancel] = useState<TeamInvite | null>(null);

  const queryClient = useQueryClient();

  // Fetch team members
  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['/api/team/members'],
    queryFn: async () => {
      const response = await fetch('/api/team/members', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch team members');
      return response.json();
    },
  });

  // Fetch pending invites
  const { data: invites, isLoading: loadingInvites } = useQuery({
    queryKey: ['/api/team/invites'],
    queryFn: async () => {
      const response = await fetch('/api/team/invites', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch invites');
      return response.json();
    },
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: 'admin' | 'user' }) => {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to send invitation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team invitation sent successfully",
      });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole('user');
      queryClient.invalidateQueries({ queryKey: ['/api/team/invites'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/team/member/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to remove member');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team member removed successfully",
      });
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    },
  });

  // Cancel invite mutation
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await fetch(`/api/team/invite/${inviteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to cancel invitation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invitation cancelled successfully",
      });
      setInviteToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['/api/team/invites'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
      const response = await fetch(`/api/team/member/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member role updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member role",
        variant: "destructive",
      });
    },
  });

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    sendInviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleRemoveMember = (member: TeamMember) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleCancelInvite = (invite: TeamInvite) => {
    setInviteToCancel(invite);
  };

  const confirmRemoveMember = () => {
    if (memberToDelete) {
      removeMemberMutation.mutate(memberToDelete._id);
    }
  };

  const confirmCancelInvite = () => {
    if (inviteToCancel) {
      cancelInviteMutation.mutate(inviteToCancel._id);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Team Management</h1>
          <p className="text-gray-400">Manage your team members and invitations</p>
        </div>

        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#F74000] hover:bg-[#E63900]">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md mx-auto bg-background border border-border max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-lg">Invite Team Member</DialogTitle>
              <DialogDescription className="text-gray-400">
                Send an invitation to add a new member to your team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="email" className="text-white">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="role" className="text-white">Role</Label>
                <Select value={inviteRole} onValueChange={(value: 'admin' | 'user') => setInviteRole(value)}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
                className="border-gray-700 text-white hover:bg-gray-800 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={sendInviteMutation.isPending}
                className="bg-[#F74000] hover:bg-[#E63900] w-full sm:w-auto"
              >
                {sendInviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-900">
          <TabsTrigger value="members" className="data-[state=active]:bg-[#F74000]">Team Members</TabsTrigger>
          <TabsTrigger value="invites" className="data-[state=active]:bg-[#F74000]">Pending Invites</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card className="bg-black border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Team Members</CardTitle>
              <CardDescription className="text-gray-400">
                Manage your current team members and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMembers ? (
                <div className="text-center py-8 text-gray-400">Loading team members...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-400">Member</TableHead>
                      <TableHead className="text-gray-400">Role</TableHead>
                      <TableHead className="text-gray-400">Joined</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members?.data?.map((member: TeamMember) => (
                      <TableRow key={member._id} className="border-gray-800">
                        <TableCell className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-gray-800 text-white">
                              {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-white">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-gray-400">{member.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(member.role)}
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {member.role}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {member.role !== 'owner' && (
                              <>
                                <Select
                                  value={member.role}
                                  onValueChange={(value: 'admin' | 'user') =>
                                    updateRoleMutation.mutate({ userId: member._id, role: value })
                                  }
                                >
                                  <SelectTrigger className="w-32 bg-gray-900 border-gray-700 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-900 border-gray-700">
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          <Card className="bg-black border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Pending Invitations</CardTitle>
              <CardDescription className="text-gray-400">
                Manage pending team invitations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInvites ? (
                <div className="text-center py-8 text-gray-400">Loading invitations...</div>
              ) : invites?.data?.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No pending invitations</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-400">Role</TableHead>
                      <TableHead className="text-gray-400">Invited By</TableHead>
                      <TableHead className="text-gray-400">Expires</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites?.data?.map((invite: TeamInvite) => (
                      <TableRow key={invite._id} className="border-gray-800">
                        <TableCell className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-white">{invite.email}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(invite.role)}
                            <Badge variant={getRoleBadgeVariant(invite.role)}>
                              {invite.role}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {invite.invitedBy.firstName} {invite.invitedBy.lastName}
                        </TableCell>
                        <TableCell className="flex items-center gap-2 text-gray-400">
                          <Clock className="h-4 w-4" />
                          {new Date(invite.expiresAt).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvite(invite)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Member Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmRemoveMember}
        title="Remove Team Member"
        description="Are you sure you want to remove this team member? They will lose access to the organization immediately."
        itemName={memberToDelete ? `${memberToDelete.firstName} ${memberToDelete.lastName}` : ''}
        isLoading={removeMemberMutation.isPending}
      />

      {/* Cancel Invite Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!inviteToCancel}
        onClose={() => setInviteToCancel(null)}
        onConfirm={confirmCancelInvite}
        title="Cancel Invitation"
        description="Are you sure you want to cancel this invitation? The recipient will no longer be able to join your team using this invite."
        itemName={inviteToCancel?.email || ''}
        isLoading={cancelInviteMutation.isPending}
      />
    </div>
  );
}