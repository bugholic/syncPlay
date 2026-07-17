"use client";

interface UserListProps {
  users: string[];
  host: string;
  username: string;
}

export default function UserList({ users, host, username }: UserListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {users.map((user) => (
        <span
          key={user}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
            user === username
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-background text-foreground border border-card-border"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${user === host ? "bg-success" : "bg-muted"}`} />
          {user}
          {user === username && " (you)"}
          {user === host && " (host)"}
        </span>
      ))}
    </div>
  );
}
