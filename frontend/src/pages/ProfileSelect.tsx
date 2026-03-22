import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers, useCreateUser } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tv, Plus, Dices } from "lucide-react";

export default function ProfileSelect() {
  const navigate = useNavigate();
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const handleContinue = () => {
    if (selectedUserId) {
      navigate(`/dashboard/${selectedUserId}`);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const user = await createUser.mutateAsync(newName.trim());
      setSelectedUserId(user.id);
      setDialogOpen(false);
      setNewName("");
      navigate(`/dashboard/${user.id}`);
    } catch {
      // error handled by mutation
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Dices className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Random Episode</CardTitle>
          <CardDescription>
            Pick a random episode from your favorite shows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Profile</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={isLoading ? "Loading..." : "Choose a profile"}
                />
              </SelectTrigger>
              <SelectContent>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2">
                      <Tv className="h-4 w-4" />
                      {u.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleContinue}
              disabled={!selectedUserId}
              className="flex-1"
            >
              Continue
            </Button>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Enter your name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createUser.isPending}
            >
              {createUser.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
          {createUser.isError && (
            <p className="text-sm text-destructive">
              {(createUser.error as Error).message}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
