import React from "react";
import styled, { ThemeProvider } from "styled-components";
import { lightTheme } from "../../constants/theme";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

const StyledLayoutWrapper = styled.div`
  background: #fff;
  font-family: system-ui, "Segoe UI", sans-serif;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const ContentWrapper = styled.div`
  flex: 1;
`;

const PageLayout = ({ children }: React.PropsWithChildren) => {
  return (
    <ThemeProvider theme={lightTheme}>
      <StyledLayoutWrapper>
        <Navbar />
        <ContentWrapper>{children}</ContentWrapper>
        <Footer />
      </StyledLayoutWrapper>
    </ThemeProvider>
  );
};

export default PageLayout;
