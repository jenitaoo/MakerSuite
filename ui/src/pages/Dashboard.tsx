import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Dashboard = () => {
  const auth = useContext(AuthContext);

  if (auth?.isLoading) {
    return <div>Loading user data...</div>;
  }

  return (
    <div>
      <h2>Dashboard</h2>
      {auth?.user ? <h3>Welcome, {auth.user.username}!!!</h3> : <p>No user data found!!</p>}
    </div>
  );
};

export default Dashboard;
