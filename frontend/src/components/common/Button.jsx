import React from "react";
import Button from "@mui/material/Button";

function CustomButton({ children }) {
  return (
    <Button
      variant="contained"
      sx={{ backgroundColor: "white", height: "10vh" }}
    >
      {children}
    </Button>
  );
}

export default CustomButton;
